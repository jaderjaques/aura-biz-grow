-- Create secure RPC function to get own TOTP secret (for disabling 2FA)
CREATE OR REPLACE FUNCTION public.get_own_totp_secret()
 RETURNS TABLE(totp_secret text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only return TOTP secret for the authenticated user
  RETURN QUERY
  SELECT p.totp_secret
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$function$;

-- Create secure RPC function to get TOTP secret for login verification
-- This is used during the login flow where user is partially authenticated
CREATE OR REPLACE FUNCTION public.get_totp_secret_for_login(p_user_id uuid)
 RETURNS TABLE(totp_secret text, backup_codes text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- During login, the user may not be fully authenticated yet
  -- This function is used to verify 2FA during the login process
  -- The caller must provide the user_id from the initial password auth
  RETURN QUERY
  SELECT p.totp_secret, p.backup_codes
  FROM public.profiles p
  WHERE p.id = p_user_id;
END;
$function$;

-- Add comments for documentation
COMMENT ON FUNCTION public.get_own_totp_secret() IS 'Securely retrieves TOTP secret for the authenticated user only. Used for 2FA disable verification.';
COMMENT ON FUNCTION public.get_totp_secret_for_login(uuid) IS 'Retrieves TOTP secret and backup codes for login verification. Used during 2FA step of login process.';