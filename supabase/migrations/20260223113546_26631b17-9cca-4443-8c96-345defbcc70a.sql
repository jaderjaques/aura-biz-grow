
-- Tabela para logs de escalonamento de chat
CREATE TABLE public.escalation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id),
  reason TEXT NOT NULL,
  trigger_type TEXT,
  trigger_value JSONB,
  ai_last_message TEXT,
  conversation_summary TEXT,
  notification_sent BOOLEAN DEFAULT false,
  notifications_sent_to TEXT[],
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.escalation_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users view escalations"
  ON public.escalation_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System insert escalations"
  ON public.escalation_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins update escalations"
  ON public.escalation_logs FOR UPDATE
  USING (is_admin(auth.uid()));
