-- 1. Tabela de tarefas
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Título e descrição
  title TEXT NOT NULL,
  description TEXT,
  
  -- Relacionamentos
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  
  -- Atribuição
  assigned_to UUID REFERENCES public.profiles(id),
  
  -- Status: 'todo', 'in_progress', 'waiting', 'done', 'cancelled'
  status TEXT DEFAULT 'todo',
  
  -- Prioridade: 'low', 'medium', 'high', 'urgent'
  priority TEXT DEFAULT 'medium',
  
  -- Tipo: 'call', 'email', 'meeting', 'follow_up', 'general'
  task_type TEXT,
  
  -- Datas
  due_date DATE,
  due_time TIME,
  completed_at TIMESTAMPTZ,
  
  -- Recorrência
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  recurrence_config JSONB,
  parent_task_id UUID REFERENCES public.tasks(id),
  
  -- Lembretes
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_minutes_before INT DEFAULT 30,
  reminder_sent BOOLEAN DEFAULT false,
  
  -- Checklist
  checklist JSONB,
  
  -- Anexos
  attachments JSONB,
  
  -- Tags
  tags TEXT[],
  
  -- Ordem no kanban
  kanban_order INT,
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Templates de tarefas
CREATE TABLE public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT,
  priority TEXT DEFAULT 'medium',
  default_assigned_to UUID REFERENCES public.profiles(id),
  duration_minutes INT,
  recurrence_pattern TEXT NOT NULL,
  recurrence_config JSONB,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Comentários em tarefas
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  mentions UUID[],
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Alterar tabela activities existente para adicionar campos
ALTER TABLE public.activities 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS activity_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS duration_minutes INT,
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_date DATE,
  ADD COLUMN IF NOT EXISTS attachments JSONB;

-- 5. RLS Policies para tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tasks"
  ON public.tasks FOR SELECT
  USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    is_admin(auth.uid())
  );

CREATE POLICY "Users create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update own tasks"
  ON public.tasks FOR UPDATE
  USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    is_admin(auth.uid())
  );

CREATE POLICY "Admins delete tasks"
  ON public.tasks FOR DELETE
  USING (is_admin(auth.uid()));

-- 6. RLS Policies para task_templates
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view templates"
  ON public.task_templates FOR SELECT
  USING (active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage templates"
  ON public.task_templates FOR ALL
  USING (is_admin(auth.uid()));

-- 7. RLS Policies para task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage task comments"
  ON public.task_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_comments.task_id 
      AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid() OR is_admin(auth.uid()))
    )
  );

-- 8. Índices
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to) WHERE status != 'done';
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date) WHERE status != 'done';
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_lead ON public.tasks(lead_id);
CREATE INDEX idx_tasks_customer ON public.tasks(customer_id);
CREATE INDEX idx_tasks_kanban ON public.tasks(status, kanban_order);
CREATE INDEX idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX idx_activities_customer ON public.activities(customer_id);
CREATE INDEX idx_activities_date ON public.activities(activity_date DESC);

-- 9. Triggers
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 10. Função para registrar atividade ao completar tarefa
CREATE OR REPLACE FUNCTION public.log_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    NEW.completed_at := NOW();
    
    INSERT INTO public.activities (
      lead_id, customer_id, deal_id, task_id,
      activity_type, title, description,
      activity_date, created_by
    ) VALUES (
      NEW.lead_id, NEW.customer_id, NEW.deal_id, NEW.id,
      'task_completed',
      'Tarefa concluída: ' || NEW.title,
      NEW.description,
      NOW(),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER task_completion_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_task_completion();

-- 11. Função para atualizar last_contact_at ao registrar atividade
CREATE OR REPLACE FUNCTION public.update_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activity_type IN ('call', 'email', 'whatsapp', 'meeting') THEN
    IF NEW.lead_id IS NOT NULL THEN
      UPDATE public.leads 
      SET last_contact_at = COALESCE(NEW.activity_date, NOW())
      WHERE id = NEW.lead_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_contact_trigger
  AFTER INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_contact();