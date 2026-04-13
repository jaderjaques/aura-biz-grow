import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TenantFiscalConfig {
  id?: string;
  tenant_id: string;
  // Dados da empresa
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  inscricao_municipal: string | null;
  inscricao_estadual: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  // Endereço
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  // NFS-e
  nfse_ambiente: "homologacao" | "producao";
  nfse_serie_rps: string | null;
  nfse_numero_rps: number;
  nfse_codigo_servico: string | null;
  nfse_cnae: string | null;
  nfse_aliquota_iss: number | null;
  nfse_regime_tributario: string | null;
  nfse_optante_simples: boolean;
  nfse_incentivador: boolean;
  nfse_natureza_operacao: string | null;
  // Certificado
  certificate_path: string | null;
  certificate_password: string | null;
  certificate_expires_at: string | null;
  certificate_subject: string | null;
}

export const REGIME_TRIBUTARIO_OPTIONS = [
  { value: "1", label: "Simples Nacional" },
  { value: "2", label: "Simples Nacional — Excesso" },
  { value: "3", label: "Regime Normal (Lucro Presumido / Real)" },
];

export const NATUREZA_OPERACAO_OPTIONS = [
  { value: "1", label: "1 — Tributação no Município" },
  { value: "2", label: "2 — Tributação Fora do Município" },
  { value: "3", label: "3 — Isenção" },
  { value: "4", label: "4 — Imune" },
  { value: "5", label: "5 — Exigibilidade Suspensa por Decisão Judicial" },
  { value: "6", label: "6 — Exigibilidade Suspensa por Procedimento Adm." },
];

export function useTenantFiscalConfig() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id ?? null;

  return useQuery({
    queryKey: ["tenant-fiscal-config", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("tenant_fiscal_config")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data as TenantFiscalConfig | null;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveTenantFiscalConfig() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id ?? null;

  return useMutation({
    mutationFn: async (values: Partial<TenantFiscalConfig>) => {
      if (!tenantId) throw new Error("Tenant não identificado.");

      const payload = { ...values, tenant_id: tenantId };

      // Upsert: cria se não existe, atualiza se existe
      const { data, error } = await supabase
        .from("tenant_fiscal_config")
        .upsert(payload, { onConflict: "tenant_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-fiscal-config", tenantId] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Tente novamente.";
      toast.error("Erro ao salvar configurações", { description: msg });
    },
  });
}

export function useUploadCertificate() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id ?? null;

  return useMutation({
    mutationFn: async ({ file, password }: { file: File; password: string }) => {
      if (!tenantId) throw new Error("Tenant não identificado.");

      // Validar extensão
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "pfx" && ext !== "p12") {
        throw new Error("Apenas arquivos .pfx ou .p12 são aceitos.");
      }

      // Validar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("O certificado não pode ultrapassar 5MB.");
      }

      const fileName = `${tenantId}/certificate_${Date.now()}.${ext}`;

      // Upload no bucket privado
      const { error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Salvar path e senha na tabela fiscal config
      const { error: dbError } = await supabase
        .from("tenant_fiscal_config")
        .upsert(
          {
            tenant_id: tenantId,
            certificate_path: fileName,
            certificate_password: password, // TODO: criptografar via Edge Function
          },
          { onConflict: "tenant_id" }
        );

      if (dbError) throw dbError;

      return fileName;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-fiscal-config", tenantId] });
      toast.success("Certificado digital enviado com sucesso!");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Tente novamente.";
      toast.error("Erro ao enviar certificado", { description: msg });
    },
  });
}
