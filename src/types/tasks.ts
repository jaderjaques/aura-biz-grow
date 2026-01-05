export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'call' | 'email' | 'meeting' | 'follow_up' | 'general';

export interface ChecklistItem {
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  lead_id: string | null;
  customer_id: string | null;
  deal_id: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  task_type: TaskType | null;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  recurrence_config: Record<string, unknown> | null;
  parent_task_id: string | null;
  reminder_enabled: boolean;
  reminder_minutes_before: number;
  reminder_sent: boolean;
  checklist: ChecklistItem[] | null;
  attachments: Record<string, unknown>[] | null;
  tags: string[] | null;
  kanban_order: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TaskWithDetails extends Task {
  lead?: { id: string; company_name: string } | null;
  customer?: { id: string; company_name: string } | null;
  deal?: { id: string; title: string } | null;
  assigned_user?: { id: string; full_name: string; avatar_url: string | null } | null;
  created_by_user?: { id: string; full_name: string } | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  comment: string;
  mentions: string[] | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by_user?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface Activity {
  id: string;
  lead_id: string | null;
  customer_id: string | null;
  deal_id: string | null;
  task_id: string | null;
  activity_type: string;
  title: string;
  description: string | null;
  outcome: string | null;
  activity_date: string | null;
  duration_minutes: number | null;
  next_action: string | null;
  next_action_date: string | null;
  attachments: Record<string, unknown>[] | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string | null;
}

export interface ActivityWithDetails extends Activity {
  lead?: { id: string; company_name: string } | null;
  customer?: { id: string; company_name: string } | null;
  deal?: { id: string; title: string } | null;
  task?: { id: string; title: string } | null;
  created_by_user?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface TaskMetrics {
  myTasks: number;
  dueToday: number;
  overdue: number;
  completedToday: number;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'A Fazer',
  in_progress: 'Em Progresso',
  waiting: 'Aguardando',
  done: 'Concluído',
  cancelled: 'Cancelado',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  call: 'Ligação',
  email: 'Email',
  meeting: 'Reunião',
  follow_up: 'Follow-up',
  general: 'Geral',
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: 'Ligação',
  email: 'Email',
  whatsapp: 'WhatsApp',
  meeting: 'Reunião',
  note: 'Nota',
  status_change: 'Mudança de Status',
  task_completed: 'Tarefa Concluída',
};

export const OUTCOME_LABELS: Record<string, string> = {
  successful: 'Sucesso',
  no_answer: 'Sem Resposta',
  follow_up_needed: 'Requer Follow-up',
  meeting_scheduled: 'Reunião Agendada',
  not_interested: 'Sem Interesse',
  callback_requested: 'Retorno Solicitado',
};
