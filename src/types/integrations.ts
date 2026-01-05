import { Json } from "@/integrations/supabase/types";

export interface ApiKey {
  id: string;
  user_id: string | null;
  key_name: string;
  api_key: string;
  scopes: string[] | null;
  rate_limit_requests_per_minute: number | null;
  active: boolean | null;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string | null;
}

export interface Webhook {
  id: string;
  user_id: string | null;
  name: string;
  url: string;
  events: string[];
  auth_type: string | null;
  auth_config: Json | null;
  custom_headers: Json | null;
  retry_enabled: boolean | null;
  retry_max_attempts: number | null;
  active: boolean | null;
  total_deliveries: number | null;
  successful_deliveries: number | null;
  failed_deliveries: number | null;
  last_delivery_at: string | null;
  last_delivery_status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WebhookLog {
  id: string;
  webhook_id: string | null;
  event_type: string;
  payload: Json;
  request_url: string | null;
  request_headers: Json | null;
  request_body: Json | null;
  response_status: number | null;
  response_body: string | null;
  response_time_ms: number | null;
  attempt_number: number | null;
  success: boolean | null;
  error_message: string | null;
  created_at: string | null;
}

export interface MessageTemplate {
  id: string;
  name: string;
  description: string | null;
  template_type: string;
  subject: string | null;
  body: string;
  preview_text: string | null;
  category: string | null;
  active: boolean | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface IntegrationLog {
  id: string;
  integration_type: string;
  action: string;
  request_data: Json | null;
  response_status: string | null;
  response_data: Json | null;
  success: boolean | null;
  error_message: string | null;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
}

export interface IntegrationSetting {
  id: string;
  integration_name: string;
  config: Json;
  active: boolean | null;
  last_test_at: string | null;
  last_test_success: boolean | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export const AVAILABLE_SCOPES = [
  { value: "leads:read", label: "Leads - Leitura" },
  { value: "leads:write", label: "Leads - Escrita" },
  { value: "customers:read", label: "Clientes - Leitura" },
  { value: "customers:write", label: "Clientes - Escrita" },
  { value: "deals:read", label: "Deals - Leitura" },
  { value: "deals:write", label: "Deals - Escrita" },
  { value: "invoices:read", label: "Faturas - Leitura" },
  { value: "invoices:write", label: "Faturas - Escrita" },
  { value: "tickets:read", label: "Tickets - Leitura" },
  { value: "tickets:write", label: "Tickets - Escrita" },
  { value: "tasks:read", label: "Tarefas - Leitura" },
  { value: "tasks:write", label: "Tarefas - Escrita" },
];

export const AVAILABLE_EVENTS = [
  { value: "lead.created", label: "Lead criado", category: "Leads" },
  { value: "lead.updated", label: "Lead atualizado", category: "Leads" },
  { value: "lead.stage_changed", label: "Estágio do lead alterado", category: "Leads" },
  { value: "lead.converted", label: "Lead convertido", category: "Leads" },
  { value: "deal.created", label: "Deal criado", category: "Deals" },
  { value: "deal.updated", label: "Deal atualizado", category: "Deals" },
  { value: "deal.won", label: "Deal ganho", category: "Deals" },
  { value: "deal.lost", label: "Deal perdido", category: "Deals" },
  { value: "task.created", label: "Tarefa criada", category: "Tarefas" },
  { value: "task.completed", label: "Tarefa concluída", category: "Tarefas" },
  { value: "task.overdue", label: "Tarefa atrasada", category: "Tarefas" },
  { value: "ticket.created", label: "Ticket criado", category: "Tickets" },
  { value: "ticket.updated", label: "Ticket atualizado", category: "Tickets" },
  { value: "ticket.resolved", label: "Ticket resolvido", category: "Tickets" },
  { value: "invoice.created", label: "Fatura criada", category: "Faturas" },
  { value: "invoice.paid", label: "Fatura paga", category: "Faturas" },
  { value: "invoice.overdue", label: "Fatura vencida", category: "Faturas" },
];

export const TEMPLATE_VARIABLES = [
  "{{customer_name}}",
  "{{company_name}}",
  "{{contact_name}}",
  "{{lead_name}}",
  "{{deal_title}}",
  "{{invoice_number}}",
  "{{invoice_amount}}",
  "{{due_date}}",
  "{{ticket_number}}",
  "{{user_name}}",
  "{{current_date}}",
  "{{current_time}}",
];
