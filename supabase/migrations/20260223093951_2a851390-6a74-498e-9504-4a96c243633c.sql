
CREATE TABLE public.ai_knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  content_text TEXT,
  chunks JSONB,
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  last_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active documents"
  ON public.ai_knowledge_documents FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert documents"
  ON public.ai_knowledge_documents FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update documents"
  ON public.ai_knowledge_documents FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete documents"
  ON public.ai_knowledge_documents FOR DELETE
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_knowledge_documents_active 
  ON public.ai_knowledge_documents(is_active);
