export interface Patient {
  id: string;
  tenant_id: string;
  full_name: string;
  cpf: string | null;
  rg: string | null;
  birth_date: string | null;
  gender: "M" | "F" | "O" | "N" | null;
  marital_status: string | null;
  profession: string | null;
  phone: string;
  phone_secondary: string | null;
  email: string | null;
  whatsapp: string | null;
  preferred_contact: "phone" | "whatsapp" | "email";
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  responsible_name: string | null;
  responsible_cpf: string | null;
  responsible_phone: string | null;
  responsible_relationship: string | null;
  has_insurance: boolean;
  insurance_id: string | null;
  insurance_card_number: string | null;
  insurance_validity: string | null;
  source: string;
  referred_by_patient_id: string | null;
  referred_by_name: string | null;
  instagram: string | null;
  status: "active" | "inactive" | "blocked";
  notes: string | null;
  allergies: string | null;
  tags: string[] | null;
  // Campos clínicos adicionais
  prontuario_number: string | null;
  social_name: string | null;
  nickname: string | null;
  blood_type: string | null;
  education_level: string | null;
  preferred_professional_id: string | null;
  preferred_day: string | null;
  preferred_time: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
  // Dados fiscais (responsável pela NF)
  fiscal_same_as_patient: boolean | null;
  fiscal_name: string | null;
  fiscal_document_type: "cpf" | "cnpj" | null;
  fiscal_document: string | null;
  fiscal_email: string | null;
  fiscal_phone: string | null;
  fiscal_company_name: string | null;
  fiscal_ie: string | null;
  fiscal_im: string | null;
  fiscal_address_street: string | null;
  fiscal_address_number: string | null;
  fiscal_address_complement: string | null;
  fiscal_address_neighborhood: string | null;
  fiscal_address_city: string | null;
  fiscal_address_state: string | null;
  fiscal_address_zip: string | null;
}

export interface PatientWithDetails extends Patient {
  insurance?: {
    id: string;
    name: string;
  } | null;
  preferred_professional?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  // From patient_summary view
  total_appointments?: number;
  completed_appointments?: number;
  no_shows?: number;
  last_appointment?: string | null;
  next_appointment?: string | null;
  total_paid?: number;
  total_pending?: number;
}

export interface Insurance {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  type: "health" | "dental" | "both";
  phone: string | null;
  email: string | null;
  website: string | null;
  billing_type: "tiss" | "manual" | "other";
  payment_deadline_days: number;
  requires_authorization: boolean;
  discount_percent: number;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PatientStatus = "active" | "inactive" | "blocked";

export type PatientGender = "M" | "F" | "O" | "N";

export const GENDER_LABELS: Record<PatientGender, string> = {
  M: "Masculino",
  F: "Feminino",
  O: "Outro",
  N: "Prefiro não informar",
};

export const SOURCE_LABELS: Record<string, string> = {
  direct: "Direto",
  referral: "Indicação",
  instagram: "Instagram",
  google: "Google",
  other: "Outro",
};
