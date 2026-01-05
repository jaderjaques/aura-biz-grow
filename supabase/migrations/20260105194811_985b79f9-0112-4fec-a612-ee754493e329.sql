-- 1. Tabela de clientes
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Vínculo com lead original
  lead_id UUID REFERENCES leads(id),
  deal_id UUID REFERENCES deals(id),
  
  -- Dados da empresa
  company_name TEXT NOT NULL,
  trading_name TEXT,
  cnpj TEXT,
  cpf TEXT,
  state_registration TEXT,
  municipal_registration TEXT,
  
  -- Perfil empresarial
  segment TEXT,
  company_size TEXT,
  revenue_range TEXT,
  employee_count INT,
  foundation_year INT,
  
  -- Contato principal
  contact_name TEXT NOT NULL,
  position TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- Endereço completo
  zip_code TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  
  -- Digital
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  linkedin TEXT,
  
  -- Plataformas
  uses_whatsapp_business BOOLEAN DEFAULT false,
  uses_instagram_business BOOLEAN DEFAULT false,
  current_tools JSONB,
  
  -- Status
  status TEXT DEFAULT 'active',
  customer_since DATE DEFAULT CURRENT_DATE,
  
  -- Valores agregados
  lifetime_value DECIMAL(10,2) DEFAULT 0,
  monthly_value DECIMAL(10,2) DEFAULT 0,
  
  -- Atribuição
  account_manager UUID REFERENCES profiles(id),
  
  -- Portal do cliente
  portal_enabled BOOLEAN DEFAULT false,
  portal_user_id UUID,
  
  -- Notas
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- 2. Templates de contratos
CREATE TABLE contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  contract_type TEXT,
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir template padrão
INSERT INTO contract_templates (name, description, contract_type, is_default, content) VALUES
('Contrato Padrão', 'Template padrão para serviços', 'general', true, 
'<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
<p>Contrato nº {{contract_number}}</p>
<p><strong>CONTRATANTE:</strong> {{customer_name}}, CNPJ {{cnpj}}, representado por {{contact_name}}.</p>
<p><strong>CONTRATADA:</strong> RESPONDE UAI LTDA</p>
<h2>CLÁUSULA 1ª - OBJETO</h2>
<p>{{products_list}}</p>
<h2>CLÁUSULA 2ª - VALORES</h2>
<p>Setup: R$ {{setup_value}}</p>
<p>Mensalidade: R$ {{monthly_value}}</p>
<p>Forma de pagamento: {{payment_method}}</p>
<p>Vencimento: Todo dia {{payment_day}}</p>
<h2>CLÁUSULA 3ª - VIGÊNCIA</h2>
<p>Início: {{start_date}} | Término: {{end_date}}</p>
<p>Data: {{start_date}}</p>
<p>_______________________________</p>
<p>CONTRATANTE: {{customer_name}}</p>
<p>_______________________________</p>
<p>CONTRATADA: Responde uAI</p>');

-- 3. Tabela de contratos
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id),
  
  contract_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  template_id UUID REFERENCES contract_templates(id),
  
  start_date DATE NOT NULL,
  end_date DATE,
  signed_date DATE,
  
  setup_value DECIMAL(10,2) DEFAULT 0,
  recurring_value DECIMAL(10,2) DEFAULT 0,
  billing_cycle TEXT DEFAULT 'monthly',
  
  products JSONB,
  
  status TEXT DEFAULT 'draft',
  auto_renew BOOLEAN DEFAULT true,
  renewal_notice_days INT DEFAULT 30,
  
  payment_day INT,
  payment_method TEXT,
  
  contract_pdf_url TEXT,
  contract_html TEXT,
  
  signature_type TEXT,
  signature_data JSONB,
  signed_by_customer_name TEXT,
  signed_by_customer_cpf TEXT,
  
  cancellation_date DATE,
  cancellation_reason TEXT,
  cancellation_requested_by UUID REFERENCES profiles(id),
  
  next_renewal_date DATE,
  renewal_alert_sent BOOLEAN DEFAULT false,
  
  notes TEXT,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Histórico de contratos
CREATE TABLE contract_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  details JSONB,
  notes TEXT,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS Policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_history ENABLE ROW LEVEL SECURITY;

-- Clientes
CREATE POLICY "Users view customers"
  ON customers FOR SELECT
  USING (account_manager = auth.uid() OR created_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users create customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update customers"
  ON customers FOR UPDATE
  USING (account_manager = auth.uid() OR created_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins delete customers"
  ON customers FOR DELETE
  USING (is_admin(auth.uid()));

-- Templates
CREATE POLICY "Users view active templates"
  ON contract_templates FOR SELECT
  USING (active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage templates"
  ON contract_templates FOR ALL
  USING (is_admin(auth.uid()));

-- Contratos
CREATE POLICY "Users manage contracts"
  ON contracts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = contracts.customer_id 
      AND (customers.account_manager = auth.uid() OR customers.created_by = auth.uid() OR is_admin(auth.uid()))
    )
  );

-- Histórico
CREATE POLICY "Users view contract history"
  ON contract_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts c
      JOIN customers cu ON cu.id = c.customer_id
      WHERE c.id = contract_history.contract_id
      AND (cu.account_manager = auth.uid() OR cu.created_by = auth.uid() OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users insert contract history"
  ON contract_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Índices
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_manager ON customers(account_manager);
CREATE INDEX idx_customers_since ON customers(customer_since DESC);
CREATE INDEX idx_customers_mrr ON customers(monthly_value DESC) WHERE status = 'active';
CREATE INDEX idx_contracts_customer ON contracts(customer_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_renewal ON contracts(next_renewal_date) WHERE status = 'active' AND next_renewal_date IS NOT NULL;
CREATE INDEX idx_contract_history_contract ON contract_history(contract_id);

-- 7. Triggers
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 8. Função para gerar contract_number
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  seq INT;
BEGIN
  year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 12) AS INT)), 0) + 1
  INTO seq
  FROM contracts
  WHERE contract_number LIKE 'CONT-' || year || '-%';
  
  RETURN 'CONT-' || year || '-' || LPAD(seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_contract_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL THEN
    NEW.contract_number := generate_contract_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_contract_number_trigger
  BEFORE INSERT ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION set_contract_number();

-- 9. Função para atualizar MRR do cliente
CREATE OR REPLACE FUNCTION update_customer_mrr()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET monthly_value = (
    SELECT COALESCE(SUM(recurring_value), 0)
    FROM contracts
    WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
    AND status = 'active'
  )
  WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mrr_on_contract_change
  AFTER INSERT OR UPDATE OR DELETE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_mrr();

-- 10. Função para calcular próxima renovação
CREATE OR REPLACE FUNCTION calculate_next_renewal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.auto_renew = true AND NEW.end_date IS NOT NULL THEN
    NEW.next_renewal_date := NEW.end_date - INTERVAL '30 days';
  ELSE
    NEW.next_renewal_date := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_next_renewal_trigger
  BEFORE INSERT OR UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_next_renewal();

-- 11. Trigger para registrar histórico
CREATE OR REPLACE FUNCTION log_contract_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO contract_history (contract_id, action, to_status, changed_by)
    VALUES (NEW.id, 'created', NEW.status, NEW.created_by);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO contract_history (contract_id, action, from_status, to_status, changed_by)
    VALUES (NEW.id, 'status_changed', OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contract_history_trigger
  AFTER INSERT OR UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION log_contract_change();