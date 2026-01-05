
-- 1. Tabela de faturas
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id),
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('setup', 'monthly', 'addon', 'consulting', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount - discount_amount + tax_amount) STORED,
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
  payment_method TEXT CHECK (payment_method IN ('boleto', 'pix', 'card', 'bank_transfer')),
  payment_confirmation TEXT,
  pdf_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_id UUID,
  boleto_barcode TEXT,
  boleto_url TEXT,
  pix_code TEXT,
  pix_qrcode_url TEXT,
  description TEXT,
  notes TEXT,
  internal_notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de pagamentos recebidos
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id),
  customer_id UUID REFERENCES public.customers(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  confirmed_at TIMESTAMPTZ,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('boleto', 'pix', 'card', 'bank_transfer')),
  transaction_id TEXT,
  bank_statement_date DATE,
  reconciled BOOLEAN DEFAULT false,
  reconciled_by UUID REFERENCES public.profiles(id),
  reconciled_at TIMESTAMPTZ,
  receipt_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de alertas financeiros
CREATE TABLE public.financial_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('invoice_due_soon', 'invoice_overdue', 'payment_received', 'contract_renewal', 'high_value_pending', 'failed_payment')),
  related_id UUID,
  related_type TEXT CHECK (related_type IN ('invoice', 'contract', 'customer', 'payment')),
  customer_id UUID REFERENCES public.customers(id),
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  alert_date DATE DEFAULT CURRENT_DATE,
  action_required BOOLEAN DEFAULT false,
  action_taken BOOLEAN DEFAULT false,
  action_taken_by UUID REFERENCES public.profiles(id),
  action_taken_at TIMESTAMPTZ,
  action_notes TEXT,
  notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMPTZ,
  notification_channel TEXT CHECK (notification_channel IN ('email', 'whatsapp', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Configurações de cobrança por cliente
CREATE TABLE public.billing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) UNIQUE,
  preferred_payment_method TEXT CHECK (preferred_payment_method IN ('boleto', 'pix', 'card', 'bank_transfer')),
  payment_day INT CHECK (payment_day >= 1 AND payment_day <= 31),
  grace_period_days INT DEFAULT 5,
  send_reminder_days_before INT DEFAULT 3,
  send_overdue_notification BOOLEAN DEFAULT true,
  billing_email TEXT,
  billing_phone TEXT,
  billing_contact_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Histórico de status de faturas
CREATE TABLE public.invoice_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT,
  notes TEXT,
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_status_history ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for invoices
CREATE POLICY "Users view invoices" ON public.invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.id = invoices.customer_id 
    AND (customers.account_manager = auth.uid() OR customers.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Users create invoices" ON public.invoices FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update invoices" ON public.invoices FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.id = invoices.customer_id 
    AND (customers.account_manager = auth.uid() OR customers.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Admins delete invoices" ON public.invoices FOR DELETE
USING (is_admin(auth.uid()));

-- 8. RLS Policies for payments
CREATE POLICY "Users view payments" ON public.payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.id = payments.customer_id 
    AND (customers.account_manager = auth.uid() OR customers.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Users manage payments" ON public.payments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.id = payments.customer_id 
    AND (customers.account_manager = auth.uid() OR customers.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);

-- 9. RLS Policies for financial_alerts
CREATE POLICY "Users view alerts" ON public.financial_alerts FOR SELECT
USING (
  customer_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.id = financial_alerts.customer_id 
    AND (customers.account_manager = auth.uid() OR customers.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Users manage alerts" ON public.financial_alerts FOR ALL
USING (auth.uid() IS NOT NULL);

-- 10. RLS Policies for billing_settings
CREATE POLICY "Users view billing_settings" ON public.billing_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.id = billing_settings.customer_id 
    AND (customers.account_manager = auth.uid() OR customers.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Users manage billing_settings" ON public.billing_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.id = billing_settings.customer_id 
    AND (customers.account_manager = auth.uid() OR customers.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);

-- 11. RLS Policies for invoice_status_history
CREATE POLICY "Users view invoice history" ON public.invoice_status_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    JOIN public.customers c ON c.id = i.customer_id
    WHERE i.id = invoice_status_history.invoice_id
    AND (c.account_manager = auth.uid() OR c.created_by = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Users insert invoice history" ON public.invoice_status_history FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 12. Indexes (without problematic CURRENT_DATE)
CREATE INDEX idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date) WHERE status IN ('pending', 'sent');
CREATE INDEX idx_invoices_overdue ON public.invoices(due_date, status) WHERE status IN ('pending', 'sent', 'overdue');
CREATE INDEX idx_invoices_recurring ON public.invoices(recurrence_id) WHERE is_recurring = true;
CREATE INDEX idx_payments_customer ON public.payments(customer_id);
CREATE INDEX idx_payments_date ON public.payments(payment_date DESC);
CREATE INDEX idx_payments_reconciled ON public.payments(reconciled) WHERE reconciled = false;
CREATE INDEX idx_alerts_customer ON public.financial_alerts(customer_id);
CREATE INDEX idx_alerts_action ON public.financial_alerts(action_required) WHERE action_taken = false;

-- 13. Triggers for updated_at
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER billing_settings_updated_at
  BEFORE UPDATE ON public.billing_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 14. Function to generate invoice_number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year TEXT;
  month TEXT;
  seq INT;
BEGIN
  year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  month := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::TEXT, 2, '0');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 13) AS INT)), 0) + 1
  INTO seq
  FROM invoices
  WHERE invoice_number LIKE 'FAT-' || year || month || '-%';
  
  RETURN 'FAT-' || year || month || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_invoice_number_trigger
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_invoice_number();

-- 15. Trigger to log invoice status changes and create alerts
CREATE OR REPLACE FUNCTION public.log_invoice_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO invoice_status_history (invoice_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    
    -- Create alert if overdue
    IF NEW.status = 'overdue' THEN
      INSERT INTO financial_alerts (
        alert_type, related_id, related_type, customer_id,
        message, severity, action_required
      ) VALUES (
        'invoice_overdue',
        NEW.id,
        'invoice',
        NEW.customer_id,
        'Fatura ' || NEW.invoice_number || ' está vencida',
        'critical',
        true
      );
    END IF;
    
    -- Create alert when paid
    IF NEW.status = 'paid' THEN
      INSERT INTO financial_alerts (
        alert_type, related_id, related_type, customer_id,
        message, severity
      ) VALUES (
        'payment_received',
        NEW.id,
        'invoice',
        NEW.customer_id,
        'Pagamento recebido: ' || NEW.invoice_number,
        'info'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invoice_status_change_trigger
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invoice_status_change();

-- 16. Trigger to update customer LTV on payment
CREATE OR REPLACE FUNCTION public.update_customer_ltv_on_invoice()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    UPDATE customers
    SET lifetime_value = COALESCE(lifetime_value, 0) + NEW.total_amount
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_ltv_on_invoice_payment
  AFTER INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_ltv_on_invoice();
