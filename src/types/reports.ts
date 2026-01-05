import { Tables } from "@/integrations/supabase/types";

export type SavedReport = Tables<"saved_reports">;
export type DashboardWidget = Tables<"dashboard_widgets">;
export type MetricsSnapshot = Tables<"metrics_snapshots">;
export type ExportLog = Tables<"export_logs">;

export type ReportType = 
  | 'sales_funnel' 
  | 'financial' 
  | 'team_performance' 
  | 'leads_analysis' 
  | 'customer_lifecycle' 
  | 'tasks_completion' 
  | 'tickets_sla' 
  | 'custom';

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export type WidgetType = 
  | 'metric_card' 
  | 'line_chart' 
  | 'bar_chart' 
  | 'pie_chart' 
  | 'table' 
  | 'funnel';

export type ExportType = 'excel' | 'csv' | 'pdf';

export type PeriodType = 
  | 'today' 
  | 'yesterday' 
  | 'this_week' 
  | 'last_week' 
  | 'this_month' 
  | 'last_month' 
  | 'this_quarter' 
  | 'this_year' 
  | 'custom';

export interface OverviewMetrics {
  totalLeads: number;
  leadsGrowth: number;
  conversionRate: number;
  conversionGrowth: number;
  mrr: number;
  mrrGrowth: number;
  avgDealValue: number;
  ticketGrowth: number;
}

export interface FunnelStage {
  name: string;
  count: number;
  value: number;
}

export interface LeadSourcePerformance {
  source: string;
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  conversionRate: number;
}

export interface TeamMemberPerformance {
  id: string;
  name: string;
  totalLeads: number;
  convertedLeads: number;
  totalDeals: number;
  wonDeals: number;
  revenue: number;
  conversionRate: number;
}

export interface RevenueDataPoint {
  month: string;
  receita: number;
  mrr: number;
}

export interface MrrMovement {
  previous: number;
  new: number;
  expansion: number;
  churn: number;
  current: number;
}

export interface LtvCacMetrics {
  ltv: number;
  cac: number;
  ratio: number;
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  sales_funnel: 'Funil de Vendas',
  financial: 'Financeiro',
  team_performance: 'Performance Equipe',
  leads_analysis: 'Análise de Leads',
  customer_lifecycle: 'Ciclo de Vida do Cliente',
  tasks_completion: 'Conclusão de Tarefas',
  tickets_sla: 'SLA de Tickets',
  custom: 'Customizado'
};

export const PERIOD_LABELS: Record<PeriodType, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  this_week: 'Esta Semana',
  last_week: 'Semana Passada',
  this_month: 'Este Mês',
  last_month: 'Mês Passado',
  this_quarter: 'Este Trimestre',
  this_year: 'Este Ano',
  custom: 'Personalizado'
};
