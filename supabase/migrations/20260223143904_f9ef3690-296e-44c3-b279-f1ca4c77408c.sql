
-- Add Google Calendar fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT false;

-- Add google_event_id to appointments table for sync tracking
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS google_event_id TEXT;
