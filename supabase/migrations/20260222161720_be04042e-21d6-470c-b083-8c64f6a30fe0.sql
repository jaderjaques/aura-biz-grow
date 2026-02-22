
-- ==================== TABELAS ====================

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  customer_id UUID REFERENCES customers(id),
  chat_id UUID REFERENCES chats(id),
  assigned_to UUID REFERENCES profiles(id),
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  company_name TEXT,
  company_niche TEXT,
  appointment_type TEXT DEFAULT 'demo',
  title TEXT NOT NULL,
  description TEXT,
  needs TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  scheduled_date DATE GENERATED ALWAYS AS ((scheduled_for AT TIME ZONE 'America/Sao_Paulo')::date) STORED,
  duration_minutes INTEGER DEFAULT 60,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  status TEXT DEFAULT 'scheduled',
  email_confirmed BOOLEAN DEFAULT false,
  email_confirmed_at TIMESTAMPTZ,
  whatsapp_confirmed BOOLEAN DEFAULT false,
  whatsapp_confirmed_at TIMESTAMPTZ,
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_1h_sent BOOLEAN DEFAULT false,
  created_by_ai BOOLEAN DEFAULT false,
  ai_conversation_summary TEXT,
  location_type TEXT DEFAULT 'online',
  meeting_link TEXT,
  physical_address TEXT,
  internal_notes TEXT,
  client_notes TEXT,
  outcome TEXT,
  outcome_notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT
);

CREATE TABLE IF NOT EXISTS appointment_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER DEFAULT 60,
  max_appointments_per_slot INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  blocked_dates DATE[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT UNIQUE NOT NULL,
  template_type TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== ÍNDICES ====================

CREATE INDEX idx_appointments_lead ON appointments(lead_id);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_chat ON appointments(chat_id);
CREATE INDEX idx_appointments_assigned ON appointments(assigned_to);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_for);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX idx_appointment_slots_user ON appointment_slots(user_id);
CREATE INDEX idx_appointment_slots_day ON appointment_slots(day_of_week);
CREATE INDEX idx_appointment_history_appointment ON appointment_history(appointment_id);

-- ==================== RLS ====================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view appointments" ON appointments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users create appointments" ON appointments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users update own appointments" ON appointments FOR UPDATE USING (
  assigned_to = auth.uid() OR is_admin(auth.uid())
);
CREATE POLICY "Users view slots" ON appointment_slots FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users manage own slots" ON appointment_slots FOR ALL USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Users view templates" ON appointment_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage templates" ON appointment_templates FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users view history" ON appointment_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "System insert history" ON appointment_history FOR INSERT WITH CHECK (true);

-- ==================== TRIGGERS ====================

CREATE OR REPLACE FUNCTION log_appointment_action()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO appointment_history (appointment_id, action, description, created_by)
    VALUES (
      NEW.id,
      'created',
      CASE 
        WHEN NEW.created_by_ai THEN 'Agendamento criado pela IA'
        ELSE 'Agendamento criado manualmente'
      END,
      CASE WHEN NEW.created_by_ai THEN NULL ELSE auth.uid() END
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO appointment_history (appointment_id, action, description)
      VALUES (NEW.id, 'status_changed', 'Status alterado de ' || OLD.status || ' para ' || NEW.status);
    END IF;
    
    IF OLD.scheduled_for IS DISTINCT FROM NEW.scheduled_for THEN
      INSERT INTO appointment_history (appointment_id, action, description)
      VALUES (NEW.id, 'rescheduled', 'Reagendado de ' || OLD.scheduled_for || ' para ' || NEW.scheduled_for);
    END IF;
    
    IF OLD.email_confirmed = false AND NEW.email_confirmed = true THEN
      INSERT INTO appointment_history (appointment_id, action, description)
      VALUES (NEW.id, 'email_confirmed', 'Cliente confirmou por email');
    END IF;
    
    IF OLD.whatsapp_confirmed = false AND NEW.whatsapp_confirmed = true THEN
      INSERT INTO appointment_history (appointment_id, action, description)
      VALUES (NEW.id, 'whatsapp_confirmed', 'Cliente confirmou por WhatsApp');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS appointment_action_trigger ON appointments;
CREATE TRIGGER appointment_action_trigger
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION log_appointment_action();

CREATE OR REPLACE FUNCTION update_appointment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS appointments_updated_at_trigger ON appointments;
CREATE TRIGGER appointments_updated_at_trigger
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_updated_at();

-- ==================== FUNCTIONS ====================

CREATE OR REPLACE FUNCTION get_available_slots(
  p_user_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER DEFAULT 60
)
RETURNS TABLE(
  slot_time TIMESTAMPTZ,
  is_available BOOLEAN
) AS $$
DECLARE
  v_day_of_week INTEGER;
  v_slot RECORD;
  v_current_time TIME;
  v_slot_datetime TIMESTAMPTZ;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  FOR v_slot IN 
    SELECT * FROM appointment_slots 
    WHERE user_id = p_user_id 
    AND day_of_week = v_day_of_week
    AND is_active = true
    AND p_date != ALL(COALESCE(blocked_dates, ARRAY[]::DATE[]))
  LOOP
    v_current_time := v_slot.start_time;
    
    WHILE v_current_time < v_slot.end_time LOOP
      v_slot_datetime := (p_date || ' ' || v_current_time)::TIMESTAMPTZ;
      
      RETURN QUERY
      SELECT 
        v_slot_datetime,
        NOT EXISTS (
          SELECT 1 FROM appointments
          WHERE assigned_to = p_user_id
          AND scheduled_for = v_slot_datetime
          AND status NOT IN ('cancelled', 'no_show')
        ) as is_available;
      
      v_current_time := v_current_time + (v_slot.slot_duration_minutes || ' minutes')::INTERVAL;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION sync_appointment_to_lead(p_appointment_id UUID)
RETURNS UUID AS $$
DECLARE
  v_appointment RECORD;
  v_lead_id UUID;
BEGIN
  SELECT * INTO v_appointment FROM appointments WHERE id = p_appointment_id;
  
  IF v_appointment.lead_id IS NOT NULL THEN
    UPDATE leads SET
      company_name = COALESCE(v_appointment.company_name, company_name),
      contact_name = COALESCE(v_appointment.client_name, contact_name),
      email = COALESCE(v_appointment.client_email, email),
      phone = COALESCE(v_appointment.client_phone, phone)
    WHERE id = v_appointment.lead_id;
    
    RETURN v_appointment.lead_id;
  ELSE
    INSERT INTO leads (
      company_name,
      contact_name,
      email,
      phone,
      source,
      status
    ) VALUES (
      COALESCE(v_appointment.company_name, v_appointment.client_name),
      v_appointment.client_name,
      v_appointment.client_email,
      COALESCE(v_appointment.client_phone, ''),
      CASE WHEN v_appointment.created_by_ai THEN 'whatsapp' ELSE 'manual' END,
      'novo'
    )
    RETURNING id INTO v_lead_id;
    
    UPDATE appointments SET lead_id = v_lead_id WHERE id = p_appointment_id;
    
    RETURN v_lead_id;
  END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
