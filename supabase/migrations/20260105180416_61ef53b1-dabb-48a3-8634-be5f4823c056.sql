-- 1. Tabela de leads/contatos
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Origem e rastreamento
  source TEXT NOT NULL DEFAULT 'manual',
  source_details JSONB,
  
  -- Dados da empresa
  company_name TEXT NOT NULL,
  trading_name TEXT,
  cnpj TEXT,
  segment TEXT,
  company_size TEXT,
  employee_count INT,
  
  -- Contato principal
  contact_name TEXT,
  position TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  
  -- Dados digitais
  website TEXT,
  instagram TEXT,
  
  -- Status e estágio
  status TEXT DEFAULT 'novo',
  stage TEXT DEFAULT 'Contato Inicial',
  
  -- Qualificação
  lead_score INT DEFAULT 0,
  needs TEXT,
  notes TEXT,
  
  -- Atribuição
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ,
  
  -- Tracking
  viewed_at TIMESTAMPTZ,
  first_contact_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  
  -- Valores estimados
  estimated_value DECIMAL(10,2),
  probability INT DEFAULT 50,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ
);

-- 2. Etapas do funil (configuráveis)
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  stage_order INT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  is_closed_won BOOLEAN DEFAULT false,
  is_closed_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir etapas padrão
INSERT INTO public.pipeline_stages (name, description, stage_order, color, is_closed_won, is_closed_lost) VALUES
  ('Contato Inicial', 'Primeiro contato com o lead', 1, '#3B82F6', false, false),
  ('Qualificação', 'Entendendo necessidades', 2, '#8B5CF6', false, false),
  ('Diagnóstico', 'Analisando fit do produto', 3, '#EC4899', false, false),
  ('Proposta', 'Proposta enviada', 4, '#F59E0B', false, false),
  ('Negociação', 'Ajustando valores/escopo', 5, '#10B981', false, false),
  ('Ganho', 'Cliente fechado!', 6, '#059669', true, false),
  ('Perdido', 'Não converteu', 7, '#EF4444', false, true);

-- 3. Histórico de mudanças de etapa
CREATE TABLE public.stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT,
  duration_seconds INT,
  notes TEXT,
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tags/Etiquetas
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6B7280',
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags padrão
INSERT INTO public.tags (name, color, category) VALUES
  ('Urgente', '#EF4444', 'prioridade'),
  ('Hot Lead', '#F59E0B', 'qualidade'),
  ('Orçamento Baixo', '#6B7280', 'financeiro'),
  ('Decisor Identificado', '#10B981', 'qualidade'),
  ('Follow-up Necessário', '#3B82F6', 'acao');

-- 5. Relação many-to-many: leads <-> tags
CREATE TABLE public.lead_tags (
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (lead_id, tag_id)
);

-- 6. Atividades/Interações (timeline)
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. RLS Policies
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

-- Leads: usuários veem leads atribuídos ou se forem admin
CREATE POLICY "Users view assigned leads or admin" ON public.leads
  FOR SELECT USING (
    assigned_to = auth.uid() OR 
    created_by = auth.uid() OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Users create leads" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update own or assigned leads" ON public.leads
  FOR UPDATE USING (
    assigned_to = auth.uid() OR 
    created_by = auth.uid() OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can delete leads" ON public.leads
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Stage history
CREATE POLICY "Users view related stage_history" ON public.stage_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE leads.id = stage_history.lead_id 
      AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users insert stage_history" ON public.stage_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Activities
CREATE POLICY "Users view related activities" ON public.activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE leads.id = activities.lead_id 
      AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users create activities" ON public.activities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update own activities" ON public.activities
  FOR UPDATE USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- Pipeline stages - todos podem ver
CREATE POLICY "Everyone can view pipeline stages" ON public.pipeline_stages
  FOR SELECT USING (true);

CREATE POLICY "Admins manage pipeline stages" ON public.pipeline_stages
  FOR ALL USING (public.is_admin(auth.uid()));

-- Tags - todos podem ver
CREATE POLICY "Everyone can view tags" ON public.tags
  FOR SELECT USING (true);

CREATE POLICY "Admins manage tags" ON public.tags
  FOR ALL USING (public.is_admin(auth.uid()));

-- Lead tags
CREATE POLICY "Users view lead_tags" ON public.lead_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE leads.id = lead_tags.lead_id 
      AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users manage lead_tags" ON public.lead_tags
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 8. Índices para performance
CREATE INDEX idx_leads_status ON public.leads(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_stage ON public.leads(stage) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_source ON public.leads(source);
CREATE INDEX idx_leads_assigned ON public.leads(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_created ON public.leads(created_at DESC);
CREATE INDEX idx_leads_score ON public.leads(lead_score DESC);

-- 9. Trigger para auto-atualizar updated_at
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 10. Função para calcular lead score automático
CREATE OR REPLACE FUNCTION public.calculate_lead_score(lead_record public.leads)
RETURNS INT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  score INT := 0;
BEGIN
  IF lead_record.email IS NOT NULL AND lead_record.email != '' THEN score := score + 10; END IF;
  IF lead_record.cnpj IS NOT NULL AND lead_record.cnpj != '' THEN score := score + 10; END IF;
  IF lead_record.website IS NOT NULL AND lead_record.website != '' THEN score := score + 5; END IF;
  IF lead_record.instagram IS NOT NULL AND lead_record.instagram != '' THEN score := score + 5; END IF;
  IF lead_record.contact_name IS NOT NULL AND lead_record.contact_name != '' THEN score := score + 10; END IF;
  IF lead_record.position IS NOT NULL AND lead_record.position != '' THEN score := score + 5; END IF;
  IF lead_record.segment IS NOT NULL AND lead_record.segment != '' THEN score := score + 10; END IF;
  IF lead_record.needs IS NOT NULL AND length(lead_record.needs) > 20 THEN score := score + 15; END IF;
  IF lead_record.estimated_value IS NOT NULL AND lead_record.estimated_value > 0 THEN score := score + 20; END IF;
  IF lead_record.first_contact_at IS NOT NULL THEN score := score + 10; END IF;
  RETURN LEAST(score, 100);
END;
$$;

-- Trigger para recalcular score ao atualizar lead
CREATE OR REPLACE FUNCTION public.update_lead_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.lead_score := public.calculate_lead_score(NEW);
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_score_on_change
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_score();