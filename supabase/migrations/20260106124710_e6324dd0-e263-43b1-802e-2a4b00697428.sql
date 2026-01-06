-- 1. Categorias de Receitas
CREATE TABLE revenue_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#10B981',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO revenue_categories (name, description, color) VALUES
  ('Mensalidades', 'Receita recorrente de mensalidades', '#10B981'),
  ('Setup', 'Receita de implantação/setup', '#3B82F6'),
  ('Consultoria', 'Receita de horas de consultoria', '#8B5CF6'),
  ('Add-ons', 'Receita de serviços adicionais', '#F59E0B'),
  ('Outras Receitas', 'Outras entradas não categorizadas', '#6B7280');

-- 2. Categorias de Despesas
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#EF4444',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO expense_categories (name, description, color) VALUES
  ('Salários', 'Folha de pagamento e encargos', '#EF4444'),
  ('Marketing', 'Investimentos em marketing e propaganda', '#EC4899'),
  ('Infraestrutura', 'Servidores, hospedagem, ferramentas SaaS', '#3B82F6'),
  ('Impostos', 'Impostos e taxas', '#F59E0B'),
  ('Fornecedores', 'Pagamentos a fornecedores', '#8B5CF6'),
  ('Escritório', 'Aluguel, contas, manutenção', '#6B7280'),
  ('Outras Despesas', 'Outras saídas não categorizadas', '#9CA3AF');

-- 3. Transações (Receitas e Despesas)
CREATE TABLE cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('revenue', 'expense')),
  revenue_category_id UUID REFERENCES revenue_categories(id),
  expense_category_id UUID REFERENCES expense_categories(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  notes TEXT,
  transaction_date DATE NOT NULL,
  payment_method TEXT,
  customer_id UUID REFERENCES customers(id),
  invoice_id UUID REFERENCES invoices(id),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_frequency TEXT,
  parent_transaction_id UUID REFERENCES cash_transactions(id),
  attachments JSONB,
  tags TEXT[],
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Contas bancárias
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  initial_balance DECIMAL(10,2) DEFAULT 0,
  current_balance DECIMAL(10,2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir conta padrão
INSERT INTO bank_accounts (name, bank_name, initial_balance, current_balance) VALUES
  ('Conta Principal', 'Geral', 0, 0);

-- 5. RLS Policies
ALTER TABLE revenue_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Categorias de receita
CREATE POLICY "Users view revenue categories"
  ON revenue_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manage revenue categories"
  ON revenue_categories FOR ALL
  USING (is_admin(auth.uid()));

-- Categorias de despesa
CREATE POLICY "Users view expense categories"
  ON expense_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manage expense categories"
  ON expense_categories FOR ALL
  USING (is_admin(auth.uid()));

-- Transações
CREATE POLICY "Users view transactions"
  ON cash_transactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users create transactions"
  ON cash_transactions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update own transactions"
  ON cash_transactions FOR UPDATE
  USING ((created_by = auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Admin delete transactions"
  ON cash_transactions FOR DELETE
  USING (is_admin(auth.uid()));

-- Contas bancárias
CREATE POLICY "Users view bank accounts"
  ON bank_accounts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manage bank accounts"
  ON bank_accounts FOR ALL
  USING (is_admin(auth.uid()));

-- 6. Índices
CREATE INDEX idx_cash_transactions_type ON cash_transactions(type);
CREATE INDEX idx_cash_transactions_date ON cash_transactions(transaction_date DESC);
CREATE INDEX idx_cash_transactions_customer ON cash_transactions(customer_id);
CREATE INDEX idx_cash_transactions_invoice ON cash_transactions(invoice_id);
CREATE INDEX idx_cash_transactions_revenue_cat ON cash_transactions(revenue_category_id);
CREATE INDEX idx_cash_transactions_expense_cat ON cash_transactions(expense_category_id);

-- 7. Trigger para updated_at
CREATE TRIGGER cash_transactions_updated_at
  BEFORE UPDATE ON cash_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 8. Function para calcular saldo
CREATE OR REPLACE FUNCTION calculate_balance(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  total_revenue DECIMAL,
  total_expenses DECIMAL,
  net_balance DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN ct.type = 'revenue' THEN ct.amount ELSE 0 END), 0::decimal) as total_revenue,
    COALESCE(SUM(CASE WHEN ct.type = 'expense' THEN ct.amount ELSE 0 END), 0::decimal) as total_expenses,
    COALESCE(SUM(CASE WHEN ct.type = 'revenue' THEN ct.amount ELSE -ct.amount END), 0::decimal) as net_balance
  FROM cash_transactions ct
  WHERE (p_start_date IS NULL OR ct.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR ct.transaction_date <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;