
-- Adicionar campos BANT na tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_budget TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_budget_value DECIMAL(12,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_budget_notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_authority TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_authority_notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_need TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_need_description TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_timeline TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_timeline_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_timeline_notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_qualified BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_qualified_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_qualified_by UUID;

-- Tabela de campos personalizados
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  field_options JSONB,
  is_required BOOLEAN DEFAULT false,
  applies_to TEXT NOT NULL DEFAULT 'leads',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de valores de campos personalizados
CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID REFERENCES custom_fields(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(field_id, entity_id)
);

-- Tabela de histórico de qualificação
CREATE TABLE IF NOT EXISTS lead_qualification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_custom_fields_active ON custom_fields(is_active, applies_to);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_lead_qualification_history_lead ON lead_qualification_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_bant_qualified ON leads(bant_qualified);
CREATE INDEX IF NOT EXISTS idx_leads_bant_score ON leads(bant_score DESC);

-- RLS
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_qualification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view custom fields"
  ON custom_fields FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage custom fields"
  ON custom_fields FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Users manage custom field values"
  ON custom_field_values FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users view qualification history"
  ON lead_qualification_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users insert qualification history"
  ON lead_qualification_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Function para calcular BANT Score
CREATE OR REPLACE FUNCTION calculate_bant_score(p_lead_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_score INTEGER := 0;
BEGIN
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  CASE v_lead.bant_budget
    WHEN 'defined' THEN v_score := v_score + 25;
    WHEN 'estimated' THEN v_score := v_score + 15;
    WHEN 'unclear' THEN v_score := v_score + 5;
    ELSE NULL;
  END CASE;

  CASE v_lead.bant_authority
    WHEN 'decision_maker' THEN v_score := v_score + 25;
    WHEN 'influencer' THEN v_score := v_score + 15;
    WHEN 'gatekeeper' THEN v_score := v_score + 5;
    ELSE NULL;
  END CASE;

  CASE v_lead.bant_need
    WHEN 'critical' THEN v_score := v_score + 25;
    WHEN 'important' THEN v_score := v_score + 15;
    WHEN 'nice_to_have' THEN v_score := v_score + 5;
    ELSE NULL;
  END CASE;

  CASE v_lead.bant_timeline
    WHEN 'immediate' THEN v_score := v_score + 25;
    WHEN 'short_term' THEN v_score := v_score + 20;
    WHEN 'medium_term' THEN v_score := v_score + 10;
    WHEN 'long_term' THEN v_score := v_score + 5;
    ELSE NULL;
  END CASE;

  RETURN v_score;
END;
$$;

-- Trigger function para atualizar BANT Score
CREATE OR REPLACE FUNCTION update_bant_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_score INTEGER;
  v_is_qualified BOOLEAN;
BEGIN
  v_new_score := calculate_bant_score(NEW.id);

  v_is_qualified := (
    v_new_score >= 60 AND
    NEW.bant_budget IS NOT NULL AND
    NEW.bant_authority IS NOT NULL AND
    NEW.bant_need IS NOT NULL AND
    NEW.bant_timeline IS NOT NULL
  );

  NEW.bant_score := v_new_score;

  IF v_is_qualified AND (OLD.bant_qualified IS NULL OR OLD.bant_qualified = false) THEN
    NEW.bant_qualified := true;
    NEW.bant_qualified_at := NOW();
    NEW.bant_qualified_by := auth.uid();
    IF NEW.status != 'qualificado' THEN
      NEW.status := 'qualificado';
    END IF;
  ELSIF NOT v_is_qualified THEN
    NEW.bant_qualified := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bant_score_update_trigger ON leads;
CREATE TRIGGER bant_score_update_trigger
  BEFORE UPDATE ON leads
  FOR EACH ROW
  WHEN (
    OLD.bant_budget IS DISTINCT FROM NEW.bant_budget OR
    OLD.bant_authority IS DISTINCT FROM NEW.bant_authority OR
    OLD.bant_need IS DISTINCT FROM NEW.bant_need OR
    OLD.bant_timeline IS DISTINCT FROM NEW.bant_timeline
  )
  EXECUTE FUNCTION update_bant_score();

-- Trigger para registrar mudanças BANT
CREATE OR REPLACE FUNCTION log_bant_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.bant_budget IS DISTINCT FROM NEW.bant_budget THEN
    INSERT INTO lead_qualification_history (lead_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'bant_budget', OLD.bant_budget, NEW.bant_budget, auth.uid());
  END IF;
  IF OLD.bant_authority IS DISTINCT FROM NEW.bant_authority THEN
    INSERT INTO lead_qualification_history (lead_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'bant_authority', OLD.bant_authority, NEW.bant_authority, auth.uid());
  END IF;
  IF OLD.bant_need IS DISTINCT FROM NEW.bant_need THEN
    INSERT INTO lead_qualification_history (lead_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'bant_need', OLD.bant_need, NEW.bant_need, auth.uid());
  END IF;
  IF OLD.bant_timeline IS DISTINCT FROM NEW.bant_timeline THEN
    INSERT INTO lead_qualification_history (lead_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'bant_timeline', OLD.bant_timeline, NEW.bant_timeline, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bant_changes_trigger ON leads;
CREATE TRIGGER bant_changes_trigger
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION log_bant_changes();

-- Inserir campos customizados padrão
INSERT INTO custom_fields (field_name, field_label, field_type, field_options, applies_to, display_order) VALUES
('empresa_segmento', 'Segmento da Empresa', 'select', '["Tecnologia", "Saúde", "Educação", "Varejo", "Serviços", "Indústria", "Outro"]', 'leads', 1),
('numero_funcionarios', 'Número de Funcionários', 'select', '["1-10", "11-50", "51-200", "201-500", "500+"]', 'leads', 2),
('faturamento_anual', 'Faturamento Anual Estimado', 'select', '["Até R$ 500k", "R$ 500k - R$ 2M", "R$ 2M - R$ 10M", "R$ 10M+"]', 'leads', 3),
('concorrente_atual', 'Solução/Concorrente Atual', 'text', null, 'leads', 4),
('dor_principal', 'Principal Dor/Problema', 'textarea', null, 'leads', 5),
('objetivo_principal', 'Objetivo ao Contratar', 'textarea', null, 'leads', 6);
