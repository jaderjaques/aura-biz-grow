
-- Create storage bucket for invoice proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for invoices bucket
CREATE POLICY "Users upload invoice proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'invoices' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users view invoice proofs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'invoices'
  );

CREATE POLICY "Users delete own invoice proofs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'invoices' AND
    auth.uid() IS NOT NULL
  );
