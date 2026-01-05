
-- 1. Tabela de produtos/serviços
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  allow_custom_pricing BOOLEAN DEFAULT false,
  min_price DECIMAL(10,2),
  max_discount_percent DECIMAL(5,2) DEFAULT 20,
  complexity_factors JSONB,
  is_recurring BOOLEAN DEFAULT false,
  billing_cycle TEXT,
  requires_setup BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  available_for_upsell BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- 2. Tabela de deals (propostas/negociações)
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  deal_number TEXT UNIQUE,
  stage TEXT DEFAULT 'proposta',
  status TEXT DEFAULT 'open',
  total_value DECIMAL(10,2) DEFAULT 0,
  setup_value DECIMAL(10,2) DEFAULT 0,
  recurring_value DECIMAL(10,2) DEFAULT 0,
  discount_total DECIMAL(10,2) DEFAULT 0,
  probability INT DEFAULT 50,
  expected_close_date DATE,
  actual_close_date DATE,
  payment_terms TEXT,
  notes TEXT,
  lost_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  closed_at TIMESTAMPTZ
);

-- 3. Produtos no deal (relação many-to-many)
CREATE TABLE deal_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INT DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  complexity_selected JSONB,
  notes TEXT,
  start_date DATE,
  subtotal DECIMAL(10,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  total DECIMAL(10,2) GENERATED ALWAYS AS ((unit_price * quantity) - discount_amount) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Propostas/Orçamentos (PDFs gerados)
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  quote_number TEXT UNIQUE NOT NULL,
  version INT DEFAULT 1,
  title TEXT NOT NULL,
  introduction TEXT,
  terms_and_conditions TEXT,
  total_value DECIMAL(10,2),
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  valid_until DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inserir produtos base
INSERT INTO products (name, description, category, type, base_price, is_recurring, billing_cycle, requires_setup, allow_custom_pricing, min_price, complexity_factors) VALUES
  ('Setup Marketing Digital', 'Configuração inicial de campanhas e estratégia digital', 'marketing', 'setup', 1500.00, false, null, false, true, 1125.00, '{"integrations": {"none": 0, "crm": 500, "erp": 1000}, "volume": {"0-1000": 0, "1000-5000": 200, "5000+": 500}, "customization": {"template": 0, "semi_custom": 300, "full_custom": 800}}'::jsonb),
  ('Plano Marketing Básico', 'Gestão de redes sociais e conteúdo mensal', 'marketing', 'monthly', 799.00, true, 'monthly', true, false, null, null),
  ('Plano Marketing Pro', 'Gestão completa + anúncios + relatórios', 'marketing', 'monthly', 1499.00, true, 'monthly', true, false, null, null),
  ('Setup Automação WhatsApp', 'Configuração de chatbot e automações', 'automation', 'setup', 2339.00, false, null, false, true, 1754.25, '{"integrations": {"none": 0, "crm": 500, "erp": 1000}, "volume": {"0-1000": 0, "1000-5000": 200, "5000+": 500}, "customization": {"template": 0, "semi_custom": 300, "full_custom": 800}}'::jsonb),
  ('Mensalidade Automação', 'Manutenção e suporte das automações', 'automation', 'monthly', 799.00, true, 'monthly', true, false, null, null),
  ('Consultoria Estratégica', 'Sessão de consultoria por hora', 'consulting', 'hourly', 300.00, false, null, false, true, 225.00, null),
  ('Integração RD Station', 'Setup de integração com RD Station', 'addon', 'one_time', 500.00, false, null, false, false, null, null),
  ('Integração HubSpot', 'Setup de integração com HubSpot', 'addon', 'one_time', 800.00, false, null, false, false, null, null);

-- 6. RLS Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Products: todos autenticados podem ver ativos
CREATE POLICY "Users view active products" ON products FOR SELECT
  USING (active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage products" ON products FOR ALL
  USING (is_admin(auth.uid()));

-- Deals: ver próprios ou admin
CREATE POLICY "Users view own deals" ON deals FOR SELECT
  USING (assigned_to = auth.uid() OR created_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users create deals" ON deals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update own deals" ON deals FOR UPDATE
  USING (assigned_to = auth.uid() OR created_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins delete deals" ON deals FOR DELETE
  USING (is_admin(auth.uid()));

-- Deal products seguem permissões do deal
CREATE POLICY "Users manage deal_products" ON deal_products FOR ALL
  USING (EXISTS (
    SELECT 1 FROM deals 
    WHERE deals.id = deal_products.deal_id 
    AND (deals.assigned_to = auth.uid() OR deals.created_by = auth.uid() OR is_admin(auth.uid()))
  ));

-- Quotes seguem permissões do deal
CREATE POLICY "Users manage quotes" ON quotes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM deals 
    WHERE deals.id = quotes.deal_id 
    AND (deals.assigned_to = auth.uid() OR deals.created_by = auth.uid() OR is_admin(auth.uid()))
  ));

-- 7. Índices
CREATE INDEX idx_products_category ON products(category) WHERE active = true;
CREATE INDEX idx_products_type ON products(type) WHERE active = true;
CREATE INDEX idx_deals_stage ON deals(stage) WHERE status = 'open';
CREATE INDEX idx_deals_lead ON deals(lead_id);
CREATE INDEX idx_deals_assigned ON deals(assigned_to);
CREATE INDEX idx_deals_close_date ON deals(expected_close_date) WHERE status = 'open';
CREATE INDEX idx_deal_products_deal ON deal_products(deal_id);
CREATE INDEX idx_quotes_deal ON quotes(deal_id);

-- 8. Triggers
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 9. Função para gerar deal_number automático
CREATE OR REPLACE FUNCTION generate_deal_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  seq INT;
BEGIN
  year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  SELECT COALESCE(MAX(CAST(SUBSTRING(deal_number FROM 11) AS INT)), 0) + 1
  INTO seq
  FROM deals
  WHERE deal_number LIKE 'DEAL-' || year || '-%';
  RETURN 'DEAL-' || year || '-' || LPAD(seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION set_deal_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deal_number IS NULL THEN
    NEW.deal_number := generate_deal_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_deal_number_trigger
  BEFORE INSERT ON deals
  FOR EACH ROW
  EXECUTE FUNCTION set_deal_number();

-- 10. Função para recalcular total do deal
CREATE OR REPLACE FUNCTION recalculate_deal_totals()
RETURNS TRIGGER AS $$
DECLARE
  deal_record RECORD;
BEGIN
  SELECT 
    COALESCE(SUM(dp.total), 0) as total,
    COALESCE(SUM(CASE WHEN p.type = 'setup' OR p.type = 'one_time' THEN dp.total ELSE 0 END), 0) as setup,
    COALESCE(SUM(CASE WHEN p.is_recurring = true THEN dp.total ELSE 0 END), 0) as recurring,
    COALESCE(SUM(dp.discount_amount), 0) as discount
  INTO deal_record
  FROM deal_products dp
  JOIN products p ON dp.product_id = p.id
  WHERE dp.deal_id = COALESCE(NEW.deal_id, OLD.deal_id);

  UPDATE deals
  SET 
    total_value = deal_record.total,
    setup_value = deal_record.setup,
    recurring_value = deal_record.recurring,
    discount_total = deal_record.discount
  WHERE id = COALESCE(NEW.deal_id, OLD.deal_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER recalc_deal_on_product_change
  AFTER INSERT OR UPDATE OR DELETE ON deal_products
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_deal_totals();

-- 11. Função para gerar quote_number automático
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  seq INT;
BEGIN
  year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 12) AS INT)), 0) + 1
  INTO seq
  FROM quotes
  WHERE quote_number LIKE 'PROP-' || year || '-%';
  RETURN 'PROP-' || year || '-' || LPAD(seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    NEW.quote_number := generate_quote_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_quote_number_trigger
  BEFORE INSERT ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_number();
