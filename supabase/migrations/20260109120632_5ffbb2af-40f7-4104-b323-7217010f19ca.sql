-- Fix Issue 1: Add authorization checks to SECURITY DEFINER functions
-- These functions must verify the caller is modifying their own account

-- Drop and recreate enable_totp_2fa with authorization check
CREATE OR REPLACE FUNCTION public.enable_totp_2fa(p_user_id uuid, p_secret text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: user can only modify their own 2FA settings
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot modify other users 2FA settings';
  END IF;

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
$function$;

-- Drop and recreate disable_totp_2fa with authorization check
CREATE OR REPLACE FUNCTION public.disable_totp_2fa(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: user can only disable their own 2FA
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot modify other users 2FA settings';
  END IF;

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
$function$;

-- Drop and recreate save_backup_codes with authorization check
CREATE OR REPLACE FUNCTION public.save_backup_codes(p_user_id uuid, p_codes text[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: user can only save their own backup codes
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot modify other users backup codes';
  END IF;

  UPDATE public.profiles
  SET backup_codes = p_codes
  WHERE id = p_user_id;
  
  RETURN true;
END;
$function$;

-- Drop and recreate reset_failed_login - only admins or the account owner can reset
CREATE OR REPLACE FUNCTION public.reset_failed_login(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: user can reset their own, or admin can reset any
  IF p_user_id != auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot reset other users login attempts';
  END IF;

  UPDATE public.profiles
  SET 
    failed_login_attempts = 0,
    locked_until = NULL
  WHERE id = p_user_id;
END;
$function$;

-- Drop and recreate use_backup_code with proper authorization
CREATE OR REPLACE FUNCTION public.use_backup_code(p_user_id uuid, p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  codes TEXT[];
  new_codes TEXT[];
  code_found BOOLEAN := false;
  i INTEGER;
BEGIN
  -- Authorization check: only the account owner can use backup codes
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot use other users backup codes';
  END IF;

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
$function$;

-- Fix Issue 2: Add api_key_hash column for secure storage
-- Add column to store hashed API keys
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS api_key_hash TEXT;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS api_key_prefix TEXT;

-- Create function to hash API keys (using pgcrypto)
CREATE OR REPLACE FUNCTION public.hash_api_key(key_value text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN encode(sha256(key_value::bytea), 'hex');
END;
$function$;

-- Create function to validate API key by hash
CREATE OR REPLACE FUNCTION public.validate_api_key(key_value text)
 RETURNS TABLE(
   id uuid,
   user_id uuid,
   key_name text,
   scopes text[],
   active boolean,
   expires_at timestamptz
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  key_hash TEXT;
BEGIN
  key_hash := public.hash_api_key(key_value);
  
  RETURN QUERY
  SELECT 
    ak.id,
    ak.user_id,
    ak.key_name,
    ak.scopes,
    ak.active,
    ak.expires_at
  FROM public.api_keys ak
  WHERE ak.api_key_hash = key_hash
    AND ak.active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > NOW());
    
  -- Update last used timestamp
  UPDATE public.api_keys
  SET last_used_at = NOW()
  WHERE api_key_hash = key_hash;
END;
$function$;

-- Add comment explaining the security model
COMMENT ON COLUMN public.api_keys.api_key IS 'DEPRECATED: Will be removed after migration. Use api_key_hash for validation.';
COMMENT ON COLUMN public.api_keys.api_key_hash IS 'SHA-256 hash of the API key for secure validation';
COMMENT ON COLUMN public.api_keys.api_key_prefix IS 'First 8 characters of the API key for identification (rua_xxxx)';

-- Update RLS on api_keys to be more restrictive
-- Users should not be able to see the full api_key column
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
CREATE POLICY "Users can view their own API keys" 
  ON public.api_keys 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Admins can view all keys (but not the actual key value - that's handled in code)
DROP POLICY IF EXISTS "Admins can view all API keys" ON public.api_keys;
CREATE POLICY "Admins can view all API keys"
  ON public.api_keys
  FOR SELECT
  USING (public.is_admin(auth.uid()));