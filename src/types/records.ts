export type RecordType =
  | "anamnesis"
  | "evolution"
  | "prescription"
  | "exam"
  | "certificate"
  | "odontogram";

export type ToothStatus =
  | "healthy"
  | "cavity"
  | "restored"
  | "crown"
  | "implant"
  | "missing"
  | "extracted"
  | "bridge"
  | "root_canal"
  | "fracture";

export type AnamnesisFieldType =
  | "text"
  | "textarea"
  | "boolean"
  | "select"
  | "multiselect"
  | "date"
  | "number";

export interface AnamnesisField {
  id: string;
  label: string;
  type: AnamnesisFieldType;
  required?: boolean;
  options?: string[];
  showIf?: { field: string; value: any };
  placeholder?: string;
}

export interface AnamnesisTemplate {
  id: string;
  tenant_id: string;
  name: string;
  module: string;
  fields: AnamnesisField[];
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ToothData {
  status: ToothStatus;
  notes?: string;
  surfaces?: string[];
}

export type TeethStatus = Record<string, ToothData>;

export interface MedicalRecord {
  id: string;
  tenant_id: string;
  patient_id: string;
  record_type: RecordType;
  title: string;
  content: Record<string, any>;
  attachments: string[] | null;
  appointment_id: string | null;
  procedure_id: string | null;
  professional_id: string | null;
  signed_at: string | null;
  signature_hash: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  version: number;
  previous_version_id: string | null;
}

export interface OdontogramRecord {
  id: string;
  patient_id: string;
  medical_record_id: string | null;
  teeth_status: TeethStatus;
  professional_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  anamnesis: "Anamnese",
  evolution: "Evolução",
  prescription: "Receita",
  exam: "Exame",
  certificate: "Atestado",
  odontogram: "Odontograma",
};

export const TOOTH_STATUS_LABELS: Record<ToothStatus, string> = {
  healthy: "Saudável",
  cavity: "Cárie",
  restored: "Restaurado",
  crown: "Coroa",
  implant: "Implante",
  missing: "Ausente",
  extracted: "Extraído",
  bridge: "Ponte",
  root_canal: "Canal",
  fracture: "Fratura",
};

export const TOOTH_STATUS_COLORS: Record<ToothStatus, string> = {
  healthy: "#e5e7eb",
  cavity: "#ef4444",
  restored: "#3b82f6",
  crown: "#f59e0b",
  implant: "#8b5cf6",
  missing: "#6b7280",
  extracted: "#374151",
  bridge: "#06b6d4",
  root_canal: "#f97316",
  fracture: "#dc2626",
};
