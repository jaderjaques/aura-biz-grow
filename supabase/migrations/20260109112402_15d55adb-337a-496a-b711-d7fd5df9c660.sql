-- =====================================================
-- SECURITY ENHANCEMENT MIGRATION
-- Two-Factor Authentication (TOTP) + Security Improvements
-- =====================================================

-- Add 2FA columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS totp_secret TEXT,
ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS backup_codes TEXT[],
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS security_questions JSONB;

-- Create security events table for audit
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for security_events - only admins and the user themselves can view
CREATE POLICY "Users can view their own security events"
ON public.security_events
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all security events"
ON public.security_events
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert security events"
ON public.security_events
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    user_id, event_type, ip_address, user_agent, details, severity
  ) VALUES (
    p_user_id, p_event_type, p_ip_address, p_user_agent, p_details, p_severity
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Create function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lock_until TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT locked_until INTO lock_until
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF lock_until IS NOT NULL AND lock_until > NOW() THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create function to increment failed login attempts
CREATE OR REPLACE FUNCTION public.increment_failed_login(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  attempts INTEGER;
  lock_duration INTERVAL := INTERVAL '15 minutes';
  max_attempts INTEGER := 5;
BEGIN
  UPDATE public.profiles
  SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1
  WHERE id = p_user_id
  RETURNING failed_login_attempts INTO attempts;
  
  -- Lock account after max attempts
  IF attempts >= max_attempts THEN
    UPDATE public.profiles
    SET locked_until = NOW() + lock_duration
    WHERE id = p_user_id;
    
    -- Log security event
    PERFORM public.log_security_event(
      p_user_id, 
      'account_locked', 
      NULL, 
      NULL, 
      jsonb_build_object('reason', 'max_failed_attempts', 'attempts', attempts),
      'critical'
    );
  END IF;
  
  RETURN attempts;
END;
$$;

-- Create function to reset failed login attempts
CREATE OR REPLACE FUNCTION public.reset_failed_login(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    failed_login_attempts = 0,
    locked_until = NULL
  WHERE id = p_user_id;
END;
$$;

-- Create function to verify TOTP and enable 2FA
CREATE OR REPLACE FUNCTION public.enable_totp_2fa(p_user_id UUID, p_secret TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    totp_secret = p_secret,
    totp_enabled = true,
    totp_verified_at = NOW()
  WHERE id = p_user_id;
  
  -- Log security event
  PERFORM public.log_security_event(
    p_user_id, 
    '2fa_enabled', 
    NULL, 
    NULL, 
    NULL,
    'info'
  );
  
  RETURN true;
END;
$$;

-- Create function to disable 2FA
CREATE OR REPLACE FUNCTION public.disable_totp_2fa(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    totp_secret = NULL,
    totp_enabled = false,
    totp_verified_at = NULL,
    backup_codes = NULL
  WHERE id = p_user_id;
  
  -- Log security event
  PERFORM public.log_security_event(
    p_user_id, 
    '2fa_disabled', 
    NULL, 
    NULL, 
    NULL,
    'warning'
  );
  
  RETURN true;
END;
$$;

-- Create function to save backup codes
CREATE OR REPLACE FUNCTION public.save_backup_codes(p_user_id UUID, p_codes TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET backup_codes = p_codes
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;

-- Create function to use a backup code
CREATE OR REPLACE FUNCTION public.use_backup_code(p_user_id UUID, p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  codes TEXT[];
  new_codes TEXT[];
  code_found BOOLEAN := false;
  i INTEGER;
BEGIN
  SELECT backup_codes INTO codes
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF codes IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if code exists and remove it
  FOR i IN 1..array_length(codes, 1) LOOP
    IF codes[i] = p_code AND NOT code_found THEN
      code_found := true;
      -- Don't add this code to new_codes
    ELSE
      new_codes := array_append(new_codes, codes[i]);
    END IF;
  END LOOP;
  
  IF code_found THEN
    UPDATE public.profiles
    SET backup_codes = new_codes
    WHERE id = p_user_id;
    
    -- Log security event
    PERFORM public.log_security_event(
      p_user_id, 
      'backup_code_used', 
      NULL, 
      NULL, 
      jsonb_build_object('remaining_codes', array_length(new_codes, 1)),
      'warning'
    );
  END IF;
  
  RETURN code_found;
END;
$$;

-- Update profiles RLS to protect sensitive 2FA fields
-- Users can only see their own totp data
CREATE POLICY "Users can view their own 2FA status"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR 
  public.is_admin(auth.uid())
);

-- Drop existing update policy if it conflicts and recreate
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Restrict API key column access - only show to owner
COMMENT ON COLUMN public.profiles.api_key IS 'SENSITIVE: API key for programmatic access';
COMMENT ON COLUMN public.profiles.totp_secret IS 'SENSITIVE: TOTP secret for 2FA - never expose to client';

-- Add comment for backup codes
COMMENT ON COLUMN public.profiles.backup_codes IS 'SENSITIVE: Hashed backup codes for 2FA recovery';