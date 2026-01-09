-- Fix: Drop permissive INSERT policy on audit_logs that allows any authenticated user to insert
-- This conflicts with the restrictive 'No direct audit log insert' policy

-- Drop the permissive policy
DROP POLICY IF EXISTS "System insert audit logs" ON public.audit_logs;

-- Verify the restrictive policy exists (create if somehow missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' 
    AND policyname = 'No direct audit log insert'
  ) THEN
    CREATE POLICY "No direct audit log insert"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (false);
  END IF;
END
$$;

-- Also drop any permissive INSERT policies on security_events for consistency
DROP POLICY IF EXISTS "System insert security events" ON public.security_events;
DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;
DROP POLICY IF EXISTS "Users can insert own security events" ON public.security_events;

-- Verify the restrictive policy exists on security_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'security_events' 
    AND policyname = 'No direct insert - use function'
  ) THEN
    CREATE POLICY "No direct insert - use function"
    ON public.security_events
    FOR INSERT
    WITH CHECK (false);
  END IF;
END
$$;

-- Add comments for documentation
COMMENT ON POLICY "No direct audit log insert" ON public.audit_logs IS 
  'Blocks all direct inserts. Use log_audit_event() SECURITY DEFINER function instead.';

-- Update log_security_event to be more versatile (add optional details parameter)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text DEFAULT 'info',
  p_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details,
    created_at
  ) VALUES (
    auth.uid(),
    p_event_type,
    p_severity,
    p_details,
    now()
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;