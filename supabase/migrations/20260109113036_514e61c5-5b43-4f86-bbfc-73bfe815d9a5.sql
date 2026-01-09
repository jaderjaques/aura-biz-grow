-- Fix RLS policy that uses WITH CHECK (true)
-- Drop the permissive policy and create a more restrictive one
DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;

-- Only allow inserting security events via the log_security_event function (SECURITY DEFINER)
-- This prevents regular users from directly inserting security events
-- The function has SECURITY DEFINER which bypasses RLS
CREATE POLICY "No direct insert - use function"
ON public.security_events
FOR INSERT
WITH CHECK (false);

-- Also fix the audit_logs table that was flagged
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- Create restrictive insert policy for audit_logs
CREATE POLICY "No direct audit log insert"
ON public.audit_logs
FOR INSERT
WITH CHECK (false);

-- Create a secure function for inserting audit logs
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id UUID;
  user_name_val TEXT;
  user_email_val TEXT;
BEGIN
  -- Get user info
  SELECT full_name, email INTO user_name_val, user_email_val
  FROM public.profiles
  WHERE id = p_user_id;

  INSERT INTO public.audit_logs (
    user_id, user_name, user_email, action, resource_type, 
    resource_id, description, changes, severity, ip_address, user_agent
  ) VALUES (
    p_user_id, user_name_val, user_email_val, p_action, p_resource_type,
    p_resource_id, p_description, p_changes, p_severity, p_ip_address, p_user_agent
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;