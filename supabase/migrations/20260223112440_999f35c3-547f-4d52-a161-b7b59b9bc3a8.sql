
-- ==================== PARTE 1A: FUNCTIONS AUXILIARES ====================

CREATE OR REPLACE FUNCTION public.get_current_chat_phone()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_phone', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.get_current_chat_email()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_email', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- ==================== PARTE 1B: QUERY_CUSTOMER (View 360) ====================

CREATE OR REPLACE VIEW public.customer_360_view AS
SELECT 
  c.id as customer_id,
  c.company_name,
  c.contact_name,
  c.email,
  c.phone,
  c.street,
  c.number,
  c.complement,
  c.neighborhood,
  c.city,
  c.state,
  c.zip_code,
  c.status,
  c.segment,
  c.cnpj,
  c.cpf,
  
  -- Faturas
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'pending') as pending_invoices,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'overdue') as overdue_invoices,
  COUNT(DISTINCT i.id) as total_invoices,
  COALESCE(SUM(i.total_amount) FILTER (WHERE i.status = 'paid'), 0) as total_spent,
  
  -- Próximo agendamento
  MIN(a.scheduled_for) FILTER (
    WHERE a.scheduled_for > NOW() 
    AND a.status IN ('scheduled', 'confirmed')
  ) as next_appointment,
  
  -- Lead associado
  l.id as lead_id,
  l.status as lead_status

FROM customers c
LEFT JOIN invoices i ON i.customer_id = c.id
LEFT JOIN appointments a ON a.customer_id = c.id
LEFT JOIN leads l ON l.id = c.lead_id
GROUP BY c.id, l.id;

-- Function: query_customer
CREATE OR REPLACE FUNCTION public.query_customer(
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT row_to_json(cv)
  INTO v_result
  FROM customer_360_view cv
  WHERE 
    (p_customer_id IS NOT NULL AND cv.customer_id = p_customer_id) OR
    (p_phone IS NOT NULL AND cv.phone = p_phone) OR
    (p_email IS NOT NULL AND cv.email = p_email)
  LIMIT 1;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- ==================== PARTE 1C: QUERY_INVOICES ====================

CREATE OR REPLACE FUNCTION public.query_invoices(
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_customer_id UUID;
BEGIN
  IF p_customer_phone IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE phone = p_customer_phone
    LIMIT 1;
  ELSE
    v_customer_id := p_customer_id;
  END IF;
  
  SELECT json_agg(invoice_data)
  INTO v_result
  FROM (
    SELECT 
      id as invoice_id,
      invoice_number,
      total_amount as amount,
      due_date,
      status,
      payment_method,
      boleto_url,
      pix_code,
      pix_qrcode_url,
      created_at
    FROM invoices
    WHERE customer_id = v_customer_id
    AND (p_status IS NULL OR status = p_status)
    ORDER BY due_date DESC
    LIMIT p_limit
  ) invoice_data;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- ==================== PARTE 1D: QUERY_PRODUCTS ====================

CREATE OR REPLACE FUNCTION public.query_products(
  p_search TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true,
  p_limit INTEGER DEFAULT 5
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(product_data)
  INTO v_result
  FROM (
    SELECT 
      id as product_id,
      name,
      description,
      category,
      base_price,
      billing_cycle,
      type,
      is_recurring,
      active as is_active
    FROM products
    WHERE 
      active = p_is_active
      AND (p_category IS NULL OR category = p_category)
      AND (
        p_search IS NULL OR
        name ILIKE '%' || p_search || '%' OR
        description ILIKE '%' || p_search || '%' OR
        category ILIKE '%' || p_search || '%'
      )
    ORDER BY 
      CASE WHEN p_search IS NOT NULL AND name ILIKE '%' || p_search || '%' THEN 1 ELSE 2 END,
      name
    LIMIT p_limit
  ) product_data;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- ==================== PARTE 1E: QUERY_APPOINTMENTS ====================

CREATE OR REPLACE FUNCTION public.query_appointments(
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_future_only BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_customer_id UUID;
BEGIN
  IF p_customer_phone IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE phone = p_customer_phone
    LIMIT 1;
  ELSE
    v_customer_id := p_customer_id;
  END IF;
  
  SELECT json_agg(appointment_data)
  INTO v_result
  FROM (
    SELECT 
      a.id as appointment_id,
      a.scheduled_for,
      a.duration_minutes,
      a.status,
      a.appointment_type,
      a.meeting_link,
      a.location_type,
      p.full_name as assigned_to_name,
      p.email as assigned_to_email
    FROM appointments a
    LEFT JOIN profiles p ON p.id = a.assigned_to
    WHERE 
      a.customer_id = v_customer_id
      AND (p_status IS NULL OR a.status = p_status)
      AND (NOT p_future_only OR a.scheduled_for > NOW())
    ORDER BY a.scheduled_for ASC
  ) appointment_data;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- ==================== PARTE 1F: UPDATE_CUSTOMER ====================

CREATE OR REPLACE FUNCTION public.update_customer_from_ai(
  p_customer_id UUID,
  p_data JSONB
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_allowed_fields TEXT[] := ARRAY['street', 'number', 'complement', 'neighborhood', 'city', 'state', 'zip_code', 'contact_name', 'phone', 'email', 'company_name'];
  v_field TEXT;
BEGIN
  FOR v_field IN SELECT jsonb_object_keys(p_data)
  LOOP
    IF NOT v_field = ANY(v_allowed_fields) THEN
      RAISE EXCEPTION 'Campo % não permitido para atualização pela IA', v_field;
    END IF;
  END LOOP;
  
  UPDATE customers
  SET
    street = COALESCE(p_data->>'street', street),
    number = COALESCE(p_data->>'number', number),
    complement = COALESCE(p_data->>'complement', complement),
    neighborhood = COALESCE(p_data->>'neighborhood', neighborhood),
    city = COALESCE(p_data->>'city', city),
    state = COALESCE(p_data->>'state', state),
    zip_code = COALESCE(p_data->>'zip_code', zip_code),
    contact_name = COALESCE(p_data->>'contact_name', contact_name),
    phone = COALESCE(p_data->>'phone', phone),
    email = COALESCE(p_data->>'email', email),
    company_name = COALESCE(p_data->>'company_name', company_name),
    updated_at = NOW()
  WHERE id = p_customer_id
  RETURNING row_to_json(customers.*) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- ==================== PARTE 1G: CREATE_TASK_FROM_AI ====================

CREATE OR REPLACE FUNCTION public.create_task_from_ai(
  p_title TEXT,
  p_description TEXT,
  p_assigned_to UUID DEFAULT NULL,
  p_priority TEXT DEFAULT 'medium',
  p_due_date DATE DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_lead_id UUID DEFAULT NULL,
  p_deal_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_task_id UUID;
BEGIN
  INSERT INTO tasks (
    title,
    description,
    assigned_to,
    priority,
    due_date,
    status,
    customer_id,
    lead_id,
    deal_id
  ) VALUES (
    p_title,
    p_description,
    p_assigned_to,
    p_priority,
    COALESCE(p_due_date, CURRENT_DATE + INTERVAL '1 day'),
    'todo',
    p_customer_id,
    p_lead_id,
    p_deal_id
  )
  RETURNING id INTO v_task_id;
  
  SELECT row_to_json(t.*)
  INTO v_result
  FROM tasks t
  WHERE t.id = v_task_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- ==================== PARTE 1I: COLUNAS EXTRAS ====================

-- Campos de controle IA no chats
ALTER TABLE chats ADD COLUMN IF NOT EXISTS ai_mode TEXT DEFAULT 'auto';
ALTER TABLE chats ADD COLUMN IF NOT EXISTS needs_human BOOLEAN DEFAULT false;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS assumed_by UUID REFERENCES profiles(id);
ALTER TABLE chats ADD COLUMN IF NOT EXISTS assumed_at TIMESTAMPTZ;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS ai_message_count INTEGER DEFAULT 0;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS human_message_count INTEGER DEFAULT 0;
