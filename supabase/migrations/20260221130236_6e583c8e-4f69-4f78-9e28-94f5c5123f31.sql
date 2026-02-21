
-- Tabela de metas financeiras
CREATE TABLE IF NOT EXISTS public.financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_type TEXT NOT NULL,
  target_value DECIMAL(12,2) NOT NULL,
  current_value DECIMAL(12,2) DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_financial_goals_period ON public.financial_goals(period_start, period_end);
CREATE INDEX idx_financial_goals_type ON public.financial_goals(goal_type);

-- RLS
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view financial goals"
  ON public.financial_goals FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users create financial goals"
  ON public.financial_goals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update own goals"
  ON public.financial_goals FOR UPDATE
  USING ((created_by = auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Admins delete goals"
  ON public.financial_goals FOR DELETE
  USING (is_admin(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER financial_goals_updated_at
  BEFORE UPDATE ON public.financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
