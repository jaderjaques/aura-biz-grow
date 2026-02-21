
-- Add scoring columns to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_grade TEXT DEFAULT 'cold';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_score_update TIMESTAMPTZ;

-- Scoring rules table
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_category TEXT NOT NULL,
  condition_field TEXT NOT NULL,
  condition_operator TEXT NOT NULL,
  condition_value TEXT NOT NULL,
  points INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Score history table
CREATE TABLE IF NOT EXISTS lead_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  old_score INTEGER,
  new_score INTEGER,
  old_grade TEXT,
  new_grade TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_score_grade ON leads(score_grade);
CREATE INDEX IF NOT EXISTS idx_lead_score_history_lead ON lead_score_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_score_history_created ON lead_score_history(created_at DESC);

-- RLS
ALTER TABLE lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view scoring rules" ON lead_scoring_rules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage scoring rules" ON lead_scoring_rules FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users view score history" ON lead_score_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "System insert score history" ON lead_score_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Default scoring rules
INSERT INTO lead_scoring_rules (rule_name, rule_category, condition_field, condition_operator, condition_value, points) VALUES
('Cargo: C-Level', 'demographic', 'position', 'contains', 'CEO,CTO,CFO,COO,Diretor', 15),
('Cargo: Gerente', 'demographic', 'position', 'contains', 'Gerente,Manager', 10),
('Cargo: Coordenador', 'demographic', 'position', 'contains', 'Coordenador,Supervisor', 5),
('Empresa Grande', 'firmographic', 'company_size', 'equals', 'Grande', 15),
('Empresa Média', 'firmographic', 'company_size', 'equals', 'Média', 10),
('Empresa Pequena', 'firmographic', 'company_size', 'equals', 'Pequena', 5),
('Contato Recente (<7 dias)', 'behavior', 'last_contact_days', 'less_than', '7', 10),
('Sem Contato (>30 dias)', 'behavior', 'last_contact_days', 'greater_than', '30', -10),
('Origem: Website', 'engagement', 'source', 'equals', 'website_form', 10),
('Origem: Google Maps', 'engagement', 'source', 'equals', 'google_maps', 8),
('Origem: WhatsApp', 'engagement', 'source', 'equals', 'whatsapp', 5),
('Status: Qualificado', 'engagement', 'status', 'equals', 'qualificado', 20),
('Status: Novo', 'engagement', 'status', 'equals', 'novo', -5);

-- Drop old trigger and function with CASCADE
DROP TRIGGER IF EXISTS lead_score_update ON leads;
DROP TRIGGER IF EXISTS calculate_score_on_change ON leads;
DROP FUNCTION IF EXISTS update_lead_score() CASCADE;

-- New rules-based scoring function
CREATE OR REPLACE FUNCTION calculate_lead_score_rules(p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_lead RECORD;
  v_rule RECORD;
  v_total_score INTEGER := 0;
  v_field_value TEXT;
  v_condition_met BOOLEAN;
  v_days_since_contact INTEGER;
BEGIN
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_lead.last_contact_at IS NOT NULL THEN
    v_days_since_contact := EXTRACT(DAY FROM (NOW() - v_lead.last_contact_at));
  ELSE
    v_days_since_contact := 999;
  END IF;

  FOR v_rule IN SELECT * FROM lead_scoring_rules WHERE is_active = true
  LOOP
    v_condition_met := false;

    CASE v_rule.condition_field
      WHEN 'position' THEN v_field_value := v_lead.position;
      WHEN 'company_size' THEN v_field_value := v_lead.company_size;
      WHEN 'segment' THEN v_field_value := v_lead.segment;
      WHEN 'source' THEN v_field_value := v_lead.source;
      WHEN 'status' THEN v_field_value := v_lead.status;
      WHEN 'last_contact_days' THEN v_field_value := v_days_since_contact::TEXT;
      ELSE v_field_value := NULL;
    END CASE;

    IF v_field_value IS NOT NULL THEN
      CASE v_rule.condition_operator
        WHEN 'equals' THEN
          v_condition_met := (LOWER(v_field_value) = LOWER(v_rule.condition_value));
        WHEN 'contains' THEN
          v_condition_met := EXISTS (
            SELECT 1 FROM unnest(string_to_array(v_rule.condition_value, ',')) AS val
            WHERE LOWER(v_field_value) LIKE '%' || LOWER(TRIM(val)) || '%'
          );
        WHEN 'greater_than' THEN
          BEGIN
            v_condition_met := (v_field_value::INTEGER > v_rule.condition_value::INTEGER);
          EXCEPTION WHEN OTHERS THEN v_condition_met := false;
          END;
        WHEN 'less_than' THEN
          BEGIN
            v_condition_met := (v_field_value::INTEGER < v_rule.condition_value::INTEGER);
          EXCEPTION WHEN OTHERS THEN v_condition_met := false;
          END;
        ELSE v_condition_met := false;
      END CASE;

      IF v_condition_met THEN
        v_total_score := v_total_score + v_rule.points;
      END IF;
    END IF;
  END LOOP;

  RETURN GREATEST(v_total_score, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Function to update score and log history
CREATE OR REPLACE FUNCTION update_lead_score_with_history(p_lead_id UUID)
RETURNS VOID AS $$
DECLARE
  v_old_score INTEGER;
  v_old_grade TEXT;
  v_new_score INTEGER;
  v_new_grade TEXT;
BEGIN
  SELECT lead_score, score_grade INTO v_old_score, v_old_grade
  FROM leads WHERE id = p_lead_id;

  v_new_score := calculate_lead_score_rules(p_lead_id);

  IF v_new_score >= 70 THEN v_new_grade := 'hot';
  ELSIF v_new_score >= 40 THEN v_new_grade := 'warm';
  ELSE v_new_grade := 'cold';
  END IF;

  UPDATE leads SET
    lead_score = v_new_score,
    score_grade = v_new_grade,
    last_score_update = NOW()
  WHERE id = p_lead_id;

  IF v_old_score IS NULL OR ABS(v_new_score - COALESCE(v_old_score, 0)) >= 5 OR COALESCE(v_old_grade, '') != v_new_grade THEN
    INSERT INTO lead_score_history (lead_id, old_score, new_score, old_grade, new_grade, reason)
    VALUES (p_lead_id, v_old_score, v_new_score, v_old_grade, v_new_grade, 'Recálculo automático');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Trigger for auto-recalculation
CREATE OR REPLACE FUNCTION trigger_update_lead_score_rules()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_lead_score_with_history(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

DROP TRIGGER IF EXISTS lead_score_rules_trigger ON leads;
CREATE TRIGGER lead_score_rules_trigger
  AFTER INSERT OR UPDATE OF position, company_size, segment, source, status, last_contact_at ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_lead_score_rules();
