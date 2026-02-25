
-- Restrict WhatsApp device API token visibility to admins only
-- Drop existing permissive SELECT policy
DROP POLICY IF EXISTS "Users view devices" ON public.whatsapp_devices;

-- Only admins can see full device data (including api_token)
CREATE POLICY "Admins view all device data" ON public.whatsapp_devices
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Create a secure view for non-admin users that excludes the api_token
CREATE OR REPLACE VIEW public.whatsapp_devices_safe AS
SELECT 
  id, device_name, phone_number, display_name, status, 
  api_url, webhook_url, is_active, last_sync_at, created_at, updated_at
FROM public.whatsapp_devices;

-- Allow authenticated users to select from the safe view
GRANT SELECT ON public.whatsapp_devices_safe TO authenticated;
