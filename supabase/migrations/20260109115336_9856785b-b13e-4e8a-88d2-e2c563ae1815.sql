-- Drop existing function and recreate with proper input validation
DROP FUNCTION IF EXISTS public.calculate_balance(date, date);

CREATE OR REPLACE FUNCTION public.calculate_balance(
  p_start_date date DEFAULT NULL::date, 
  p_end_date date DEFAULT NULL::date
)
RETURNS TABLE(total_revenue numeric, total_expenses numeric, net_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Input validation
  
  -- Validate that start_date is not after end_date when both are provided
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL AND p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Data inicial não pode ser posterior à data final';
  END IF;
  
  -- Validate reasonable date range (not more than 10 years span)
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL 
     AND (p_end_date - p_start_date) > 3650 THEN
    RAISE EXCEPTION 'O intervalo de datas não pode exceder 10 anos';
  END IF;
  
  -- Validate dates are not in the far future (more than 1 year ahead)
  IF p_start_date IS NOT NULL AND p_start_date > (CURRENT_DATE + INTERVAL '1 year')::date THEN
    RAISE EXCEPTION 'Data inicial não pode ser mais de 1 ano no futuro';
  END IF;
  
  IF p_end_date IS NOT NULL AND p_end_date > (CURRENT_DATE + INTERVAL '1 year')::date THEN
    RAISE EXCEPTION 'Data final não pode ser mais de 1 ano no futuro';
  END IF;
  
  -- Validate dates are not too far in the past (before year 2000)
  IF p_start_date IS NOT NULL AND p_start_date < '2000-01-01'::date THEN
    RAISE EXCEPTION 'Data inicial não pode ser anterior a 2000';
  END IF;
  
  IF p_end_date IS NOT NULL AND p_end_date < '2000-01-01'::date THEN
    RAISE EXCEPTION 'Data final não pode ser anterior a 2000';
  END IF;

  -- Execute the query with validated parameters
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN ct.type = 'revenue' THEN ct.amount ELSE 0 END), 0::decimal) as total_revenue,
    COALESCE(SUM(CASE WHEN ct.type = 'expense' THEN ct.amount ELSE 0 END), 0::decimal) as total_expenses,
    COALESCE(SUM(CASE WHEN ct.type = 'revenue' THEN ct.amount ELSE -ct.amount END), 0::decimal) as net_balance
  FROM cash_transactions ct
  WHERE (p_start_date IS NULL OR ct.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR ct.transaction_date <= p_end_date);
END;
$function$;

-- Add comment explaining the function's input validation
COMMENT ON FUNCTION public.calculate_balance(date, date) IS 'Calculates revenue, expenses and net balance for a date range. Validates: start <= end, max 10 year span, dates between 2000 and 1 year in future.';