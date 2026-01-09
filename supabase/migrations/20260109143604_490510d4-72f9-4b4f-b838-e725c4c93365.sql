-- Drop the existing INSERT policy and create a more permissive one
DROP POLICY IF EXISTS "Users create invoices" ON public.invoices;

-- Create new INSERT policy that allows users to create invoices for customers they manage
CREATE POLICY "Users create invoices" ON public.invoices
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_id
      AND (
        customers.account_manager = auth.uid() OR
        customers.created_by = auth.uid() OR
        is_admin(auth.uid())
      )
    )
    OR is_admin(auth.uid())
  )
);