export type TreatmentPlanStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "in_progress"
  | "completed"
  | "cancelled";

export type TreatmentPlanItemStatus =
  | "pending"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface TreatmentPlanItem {
  id: string;
  treatment_plan_id: string;
  procedure_id: string | null;
  description: string | null;
  quantity: number;
  sessions_total: number;
  sessions_completed: number;
  tooth_number: string | null;
  tooth_surface: string | null;
  body_region: string | null;
  unit_price: number;
  discount_percent: number;
  total_price: number;
  status: TreatmentPlanItemStatus;
  execution_order: number;
  notes: string | null;
  created_at: string;
  procedure?: { name: string; category: string };
}

export interface TreatmentPlan {
  id: string;
  tenant_id: string;
  patient_id: string;
  plan_number: string | null;
  title: string | null;
  status: TreatmentPlanStatus;
  created_date: string | null;
  approved_date: string | null;
  start_date: string | null;
  estimated_end_date: string | null;
  completed_date: string | null;
  validity_days: number | null;
  total_value: number;
  discount_percent: number;
  discount_amount: number;
  final_value: number;
  payment_type: string | null;
  insurance_id: string | null;
  insurance_coverage: number | null;
  patient_responsibility: number | null;
  payment_conditions: string | null;
  notes: string | null;
  professional_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  approved_by: string | null;
}

export interface TreatmentPlanWithDetails extends TreatmentPlan {
  patient?: { full_name: string; phone: string };
  insurance?: { name: string };
  items?: TreatmentPlanItem[];
}

export interface ClinicProcedure {
  id: string;
  code: string;
  name: string;
  category: string;
  module: string;
  duration_minutes: number | null;
  sessions_default: number | null;
  price_private: number | null;
  tooth_region: string | null;
  body_area: string | null;
}

export const PLAN_STATUS_LABELS: Record<TreatmentPlanStatus, string> = {
  draft: "Rascunho",
  pending_approval: "Aguardando Aprovação",
  approved: "Aprovado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const PLAN_STATUS_VARIANTS: Record<
  TreatmentPlanStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  pending_approval: "secondary",
  approved: "default",
  in_progress: "default",
  completed: "default",
  cancelled: "destructive",
};

export const ITEM_STATUS_LABELS: Record<TreatmentPlanItemStatus, string> = {
  pending: "Pendente",
  scheduled: "Agendado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};
