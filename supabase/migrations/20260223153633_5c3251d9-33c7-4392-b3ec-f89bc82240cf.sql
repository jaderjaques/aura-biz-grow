
-- Adicionar campo google_calendar_synced na tabela appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS google_calendar_synced BOOLEAN DEFAULT false;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_appointments_google_event 
  ON appointments(google_event_id);

CREATE INDEX IF NOT EXISTS idx_profiles_google_connected 
  ON profiles(google_calendar_connected);
