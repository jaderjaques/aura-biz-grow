-- Fix function search_path for new functions
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION set_contract_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.contract_number IS NULL THEN
    NEW.contract_number := generate_contract_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_customer_mrr()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION calculate_next_renewal()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.auto_renew = true AND NEW.end_date IS NOT NULL THEN
    NEW.next_renewal_date := NEW.end_date - INTERVAL '30 days';
  ELSE
    NEW.next_renewal_date := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION log_contract_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;