-- 1. Categorias de tickets
CREATE TABLE ticket_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  
  -- SLA padrão (em horas)
  sla_first_response_hours INT DEFAULT 2,
  sla_resolution_hours INT DEFAULT 24,
  
  -- Cor para UI
  color TEXT DEFAULT '#8B3A8B',
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO ticket_categories (name, description, sla_first_response_hours, sla_resolution_hours, color) VALUES
  ('Técnico', 'Problemas técnicos, bugs, erros', 1, 4, '#EF4444'),
  ('Financeiro', 'Dúvidas sobre pagamentos, faturas', 2, 24, '#F59E0B'),
  ('Comercial', 'Dúvidas sobre produtos, upgrades', 4, 48, '#8B3A8B'),
  ('Geral', 'Outras solicitações', 4, 48, '#6B7280');

-- 2. Tabela de tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  ticket_number TEXT UNIQUE NOT NULL DEFAULT '',
  
  -- Cliente
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Conteúdo
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Categorização
  category_id UUID REFERENCES ticket_categories(id),
  
  -- Status
  status TEXT DEFAULT 'open',
  
  -- Prioridade
  priority TEXT DEFAULT 'medium',
  
  -- Atribuição
  assigned_to UUID REFERENCES profiles(id),
  
  -- SLA
  sla_first_response_deadline TIMESTAMPTZ,
  sla_resolution_deadline TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  -- Violações de SLA
  sla_first_response_violated BOOLEAN DEFAULT false,
  sla_resolution_violated BOOLEAN DEFAULT false,
  
  -- Rating (satisfação)
  customer_rating INT,
  customer_feedback TEXT,
  
  -- Kanban order
  kanban_order INT,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- 3. Mensagens do ticket
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  
  message TEXT NOT NULL,
  
  -- Autor
  is_internal BOOLEAN DEFAULT false,
  is_customer BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  
  -- Anexos
  attachments JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Configurações de SLA
CREATE TABLE sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  category_id UUID REFERENCES ticket_categories(id),
  priority TEXT NOT NULL,
  
  first_response_hours INT NOT NULL,
  resolution_hours INT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(category_id, priority)
);

-- 5. Base de conhecimento (FAQ)
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  category_id UUID REFERENCES ticket_categories(id),
  
  -- Visibilidade
  public BOOLEAN DEFAULT true,
  
  -- Métricas
  views_count INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  
  -- Tags
  tags TEXT[],
  
  active BOOLEAN DEFAULT true,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Respostas rápidas (templates)
CREATE TABLE quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  category_id UUID REFERENCES ticket_categories(id),
  
  -- Atalho
  shortcut TEXT UNIQUE,
  
  active BOOLEAN DEFAULT true,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir respostas rápidas padrão
INSERT INTO quick_replies (title, content, shortcut) VALUES
  ('Saudação Inicial', 'Olá! Obrigado por entrar em contato. Estou analisando sua solicitação e retorno em breve.', '/ola'),
  ('Solicitar Mais Informações', 'Para melhor atendê-lo, preciso de mais algumas informações: [DETALHAR]', '/info'),
  ('Problema Resolvido', 'Fico feliz em informar que seu problema foi resolvido. Por favor, confirme se está tudo funcionando.', '/resolvido'),
  ('Encaminhar Técnico', 'Encaminhei sua solicitação para nossa equipe técnica. Você receberá um retorno em até 24h.', '/tecnico');

-- 7. RLS Policies
ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

-- Ticket categories: todos podem ver
CREATE POLICY "Everyone view ticket categories"
  ON ticket_categories FOR SELECT
  USING (active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage ticket categories"
  ON ticket_categories FOR ALL
  USING (is_admin(auth.uid()));

-- Tickets: funcionários veem todos, clientes veem apenas seus
CREATE POLICY "Staff view all tickets"
  ON tickets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff create tickets"
  ON tickets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff update tickets"
  ON tickets FOR UPDATE
  USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    is_admin(auth.uid())
  );

CREATE POLICY "Admins delete tickets"
  ON tickets FOR DELETE
  USING (is_admin(auth.uid()));

-- Ticket messages
CREATE POLICY "Users view ticket messages"
  ON ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_messages.ticket_id 
      AND auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "Users create ticket messages"
  ON ticket_messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- SLA configs: admins gerenciam
CREATE POLICY "Everyone view sla configs"
  ON sla_configs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage sla configs"
  ON sla_configs FOR ALL
  USING (is_admin(auth.uid()));

-- Knowledge base
CREATE POLICY "Everyone view public KB"
  ON knowledge_base FOR SELECT
  USING (public = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage KB"
  ON knowledge_base FOR ALL
  USING (is_admin(auth.uid()));

-- Quick replies
CREATE POLICY "Everyone view quick replies"
  ON quick_replies FOR SELECT
  USING (active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage quick replies"
  ON quick_replies FOR ALL
  USING (is_admin(auth.uid()));

-- 8. Índices
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_status ON tickets(status) WHERE status NOT IN ('closed', 'cancelled');
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_sla_response ON tickets(sla_first_response_deadline) 
  WHERE first_response_at IS NULL AND status != 'closed';
CREATE INDEX idx_tickets_sla_resolution ON tickets(sla_resolution_deadline) 
  WHERE resolved_at IS NULL AND status NOT IN ('resolved', 'closed');
CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX idx_knowledge_base_public ON knowledge_base(public) WHERE active = true;

-- 9. Triggers
CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 10. Função para gerar ticket_number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  seq INT;
BEGIN
  year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 9) AS INT)), 0) + 1
  INTO seq
  FROM tickets
  WHERE ticket_number LIKE 'TKT-' || year || '-%';
  
  RETURN 'TKT-' || year || '-' || LPAD(seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_ticket_number_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- 11. Calcular deadlines de SLA ao criar ticket
CREATE OR REPLACE FUNCTION set_sla_deadlines()
RETURNS TRIGGER AS $$
DECLARE
  config RECORD;
  cat_config RECORD;
BEGIN
  -- Buscar config de SLA
  SELECT * INTO config
  FROM sla_configs
  WHERE category_id = NEW.category_id
  AND priority = NEW.priority;
  
  IF config IS NOT NULL THEN
    NEW.sla_first_response_deadline := NOW() + (config.first_response_hours || ' hours')::INTERVAL;
    NEW.sla_resolution_deadline := NOW() + (config.resolution_hours || ' hours')::INTERVAL;
  ELSE
    -- Fallback para padrão da categoria
    SELECT * INTO cat_config
    FROM ticket_categories
    WHERE id = NEW.category_id;
    
    IF cat_config IS NOT NULL THEN
      NEW.sla_first_response_deadline := NOW() + (cat_config.sla_first_response_hours || ' hours')::INTERVAL;
      NEW.sla_resolution_deadline := NOW() + (cat_config.sla_resolution_hours || ' hours')::INTERVAL;
    ELSE
      -- Default fallback
      NEW.sla_first_response_deadline := NOW() + INTERVAL '4 hours';
      NEW.sla_resolution_deadline := NOW() + INTERVAL '24 hours';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_sla_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_sla_deadlines();

-- 12. Marcar primeira resposta
CREATE OR REPLACE FUNCTION mark_first_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_customer = false THEN
    UPDATE tickets
    SET first_response_at = NEW.created_at
    WHERE id = NEW.ticket_id
    AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER first_response_trigger
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION mark_first_response();

-- 13. Inserir configs de SLA padrão
INSERT INTO sla_configs (category_id, priority, first_response_hours, resolution_hours)
SELECT id, 'urgent', 1, 4 FROM ticket_categories;

INSERT INTO sla_configs (category_id, priority, first_response_hours, resolution_hours)
SELECT id, 'high', 2, 8 FROM ticket_categories;

INSERT INTO sla_configs (category_id, priority, first_response_hours, resolution_hours)
SELECT id, 'medium', 4, 24 FROM ticket_categories;

INSERT INTO sla_configs (category_id, priority, first_response_hours, resolution_hours)
SELECT id, 'low', 8, 48 FROM ticket_categories;