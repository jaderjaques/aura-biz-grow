export interface Lead {
  id: string;
  source: string;
  source_details: Record<string, unknown> | null;
  company_name: string;
  trading_name: string | null;
  cnpj: string | null;
  segment: string | null;
  company_size: string | null;
  employee_count: number | null;
  contact_name: string | null;
  position: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  instagram: string | null;
  status: string;
  stage: string;
  lead_score: number;
  score_grade: string | null;
  last_score_update: string | null;
  needs: string | null;
  notes: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  viewed_at: string | null;
  first_contact_at: string | null;
  last_contact_at: string | null;
  estimated_value: number | null;
  probability: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
  // BANT fields
  bant_budget: string | null;
  bant_budget_value: number | null;
  bant_budget_notes: string | null;
  bant_authority: string | null;
  bant_authority_notes: string | null;
  bant_need: string | null;
  bant_need_description: string | null;
  bant_timeline: string | null;
  bant_timeline_date: string | null;
  bant_timeline_notes: string | null;
  bant_score: number | null;
  bant_qualified: boolean | null;
  bant_qualified_at: string | null;
  bant_qualified_by: string | null;
  // Joined data
  assigned_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  tags?: Tag[];
}

export interface PipelineStage {
  id: string;
  name: string;
  description: string | null;
  stage_order: number;
  color: string;
  is_closed_won: boolean;
  is_closed_lost: boolean;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  category: string | null;
  created_at: string;
}

export interface LeadTag {
  lead_id: string;
  tag_id: string;
  created_at: string;
}

export interface Activity {
  id: string;
  lead_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  created_by_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface StageHistory {
  id: string;
  lead_id: string;
  from_stage: string | null;
  to_stage: string | null;
  duration_seconds: number | null;
  notes: string | null;
  changed_by: string | null;
  changed_at: string;
}

export type LeadStatus = 'novo' | 'em_analise' | 'qualificado' | 'descartado';
export type LeadSource = 'manual' | 'google_maps' | 'website_form' | 'whatsapp' | 'csv_import' | 'api';
export type ActivityType = 'call' | 'email' | 'whatsapp' | 'meeting' | 'note';
