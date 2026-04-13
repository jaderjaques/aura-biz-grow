export type NfseStatus =
  | "pending"
  | "processing"
  | "emitted"
  | "error"
  | "cancelled";

export interface NfseEmission {
  id: string;
  tenant_id: string;
  treatment_plan_id: string;
  patient_id: string;

  // RPS
  numero_rps: number | null;
  serie_rps: string | null;
  tipo_rps: string;

  // Status
  status: NfseStatus;

  // Retorno da prefeitura
  numero_nfse: string | null;
  codigo_verificacao: string | null;
  data_emissao: string | null;
  link_nfse: string | null;
  pdf_url: string | null;

  // Dados do serviço
  competencia: string; // date ISO
  discriminacao: string;
  valor_servicos: number;
  valor_iss: number | null;
  aliquota_iss: number | null;
  codigo_servico: string | null;
  cnae: string | null;
  natureza_operacao: string | null;
  regime_tributario: string | null;
  optante_simples: boolean;

  // Processamento
  xml_enviado: string | null;
  xml_retorno: string | null;
  error_message: string | null;

  // Auditoria
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const NFSE_STATUS_LABELS: Record<NfseStatus, string> = {
  pending:    "Aguardando",
  processing: "Processando",
  emitted:    "Emitida",
  error:      "Erro",
  cancelled:  "Cancelada",
};

export const NFSE_STATUS_COLORS: Record<NfseStatus, string> = {
  pending:    "text-yellow-600 bg-yellow-50 border-yellow-200",
  processing: "text-blue-600 bg-blue-50 border-blue-200",
  emitted:    "text-green-600 bg-green-50 border-green-200",
  error:      "text-red-600 bg-red-50 border-red-200",
  cancelled:  "text-gray-500 bg-gray-50 border-gray-200",
};
