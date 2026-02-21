
-- Add new columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

-- Create invoice_history table for detailed action tracking
CREATE TABLE IF NOT EXISTS public.invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invoice_history ENABLE ROW LEVEL SECURITY;

-- RLS: view history if user can see the invoice's customer
CREATE POLICY "Users view invoice history"
  ON public.invoice_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.id = invoice_history.invoice_id
      AND (c.account_manager = auth.uid() OR c.created_by = auth.uid() OR is_admin(auth.uid()))
    )
  );

-- RLS: insert history for authenticated users
CREATE POLICY "Authenticated users insert invoice history"
  ON public.invoice_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_history_invoice ON public.invoice_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_created ON public.invoice_history(created_at DESC);

-- Trigger to auto-log invoice actions
CREATE OR REPLACE FUNCTION public.log_invoice_action()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.invoice_history (invoice_id, action, description, created_by)
    VALUES (NEW.id, 'created', 'Fatura criada', NEW.created_by);
  END IF;
  
  IF TG_OP = 'UPDATE' AND NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    INSERT INTO public.invoice_history (invoice_id, action, description, metadata, created_by)
    VALUES (
      NEW.id, 'paid', 'Fatura marcada como paga',
      jsonb_build_object('payment_date', NEW.payment_date, 'payment_method', NEW.payment_method),
      auth.uid()
    );
  END IF;
  
  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
    INSERT INTO public.invoice_history (invoice_id, action, description, created_by)
    VALUES (NEW.id, 'cancelled', 'Fatura cancelada', auth.uid());
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.sent_at IS NOT NULL AND OLD.sent_at IS NULL THEN
    INSERT INTO public.invoice_history (invoice_id, action, description, created_by)
    VALUES (NEW.id, 'sent', 'Fatura enviada ao cliente', auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS invoice_action_trigger ON invoices;
CREATE TRIGGER invoice_action_trigger
  AFTER INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.log_invoice_action();
