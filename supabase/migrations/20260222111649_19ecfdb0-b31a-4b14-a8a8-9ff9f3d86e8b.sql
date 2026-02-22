
-- Add missing columns to tags table
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create saved_segments table
CREATE TABLE IF NOT EXISTS public.saved_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  shared_with_team BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on saved_segments
ALTER TABLE public.saved_segments ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_segments
CREATE POLICY "Users view own or shared segments"
  ON public.saved_segments FOR SELECT
  USING (created_by = auth.uid() OR shared_with_team = true);

CREATE POLICY "Users create own segments"
  ON public.saved_segments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update own segments"
  ON public.saved_segments FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users delete own segments"
  ON public.saved_segments FOR DELETE
  USING (created_by = auth.uid());

-- Add missing RLS policies on tags for INSERT/UPDATE/DELETE
-- Check existing policies first - tags already has SELECT and ALL for admins
-- We need create/update/delete for regular users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Users create tags') THEN
    CREATE POLICY "Users create tags"
      ON public.tags FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Users update tags') THEN
    CREATE POLICY "Users update tags"
      ON public.tags FOR UPDATE
      USING (auth.uid() IS NOT NULL);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Users delete own tags') THEN
    CREATE POLICY "Users delete own tags"
      ON public.tags FOR DELETE
      USING (created_by = auth.uid() OR is_admin(auth.uid()));
  END IF;
END $$;

-- Trigger to update usage_count on lead_tags changes
CREATE OR REPLACE FUNCTION public.update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tags SET usage_count = GREATEST(usage_count - 1, 0) WHERE id = OLD.tag_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tag_usage_count_trigger ON public.lead_tags;
CREATE TRIGGER tag_usage_count_trigger
  AFTER INSERT OR DELETE ON public.lead_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tag_usage_count();

-- Trigger to update updated_at on tags
CREATE OR REPLACE FUNCTION public.update_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tags_updated_at_trigger ON public.tags;
CREATE TRIGGER tags_updated_at_trigger
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tags_updated_at();

DROP TRIGGER IF EXISTS saved_segments_updated_at_trigger ON public.saved_segments;
CREATE TRIGGER saved_segments_updated_at_trigger
  BEFORE UPDATE ON public.saved_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tags_updated_at();

-- Function to search leads by tags (AND/OR)
CREATE OR REPLACE FUNCTION public.search_leads_by_tags(
  p_tag_ids UUID[],
  p_operator TEXT DEFAULT 'OR'
)
RETURNS TABLE (lead_id UUID) AS $$
BEGIN
  IF p_operator = 'AND' THEN
    RETURN QUERY
    SELECT lt.lead_id
    FROM public.lead_tags lt
    WHERE lt.tag_id = ANY(p_tag_ids)
    GROUP BY lt.lead_id
    HAVING COUNT(DISTINCT lt.tag_id) = array_length(p_tag_ids, 1);
  ELSE
    RETURN QUERY
    SELECT DISTINCT lt.lead_id
    FROM public.lead_tags lt
    WHERE lt.tag_id = ANY(p_tag_ids);
  END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_segments_user ON public.saved_segments(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_segments_favorite ON public.saved_segments(is_favorite);

-- Insert default tags if table is empty
INSERT INTO public.tags (name, color, category, description) 
SELECT * FROM (VALUES
  ('Cliente Potencial', '#10B981', 'stage', 'Lead com alto potencial de conversão'),
  ('Aguardando Resposta', '#F59E0B', 'stage', 'Aguardando retorno do lead'),
  ('Reunião Agendada', '#3B82F6', 'stage', 'Reunião já agendada'),
  ('Proposta Enviada', '#8B3A8B', 'stage', 'Proposta comercial enviada'),
  ('Tecnologia', '#6366F1', 'industry', 'Setor de tecnologia'),
  ('Saúde', '#EC4899', 'industry', 'Setor de saúde'),
  ('Educação', '#F59E0B', 'industry', 'Setor de educação'),
  ('Varejo', '#14B8A6', 'industry', 'Setor de varejo'),
  ('Indicação', '#10B981', 'interest', 'Lead veio por indicação'),
  ('Evento', '#8B5CF6', 'interest', 'Lead capturado em evento'),
  ('Website', '#3B82F6', 'interest', 'Lead veio pelo website'),
  ('Redes Sociais', '#EC4899', 'interest', 'Lead veio de redes sociais')
) AS v(name, color, category, description)
WHERE NOT EXISTS (SELECT 1 FROM public.tags LIMIT 1);

-- Sync existing usage counts
UPDATE public.tags t SET usage_count = (
  SELECT COUNT(*) FROM public.lead_tags lt WHERE lt.tag_id = t.id
);
