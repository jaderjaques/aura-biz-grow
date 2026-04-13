import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { NfseEmission } from "@/types/nfse";

// ── Chaves de cache ───────────────────────────────────────────────────────────
const NFSE_KEY = (planId: string) => ["nfse-emissions", planId];

// ── Buscar emissões de um orçamento ──────────────────────────────────────────
export function useNfseByPlan(planId: string | null) {
  return useQuery({
    queryKey: NFSE_KEY(planId ?? ""),
    queryFn: async () => {
      if (!planId) return [];
      const { data, error } = await supabase
        .from("nfse_emissions")
        .select("*")
        .eq("treatment_plan_id", planId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NfseEmission[];
    },
    enabled: !!planId,
    staleTime: 60_000,
  });
}

// ── Payload para criar uma NFS-e ─────────────────────────────────────────────
export interface CreateNfsePayload {
  treatment_plan_id: string;
  patient_id: string;
  competencia: string;          // "YYYY-MM-DD"
  discriminacao: string;
  valor_servicos: number;
  aliquota_iss: number | null;
  codigo_servico: string | null;
  cnae: string | null;
  natureza_operacao: string | null;
  regime_tributario: string | null;
  optante_simples: boolean;
}

// ── Criar solicitação de NFS-e ───────────────────────────────────────────────
export function useCreateNfse() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id ?? null;

  return useMutation({
    mutationFn: async (payload: CreateNfsePayload) => {
      if (!tenantId) throw new Error("Tenant não identificado.");

      // Calcular valor ISS
      const valorIss =
        payload.aliquota_iss != null
          ? +(payload.valor_servicos * (payload.aliquota_iss / 100)).toFixed(2)
          : null;

      const { data, error } = await supabase
        .from("nfse_emissions")
        .insert({
          ...payload,
          tenant_id: tenantId,
          valor_iss: valorIss,
          status: "pending",
          created_by: profile?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as NfseEmission;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: NFSE_KEY(data.treatment_plan_id) });
      toast.success("NFS-e solicitada com sucesso!", {
        description: "A emissão será processada em instantes.",
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Tente novamente.";
      toast.error("Erro ao solicitar NFS-e", { description: msg });
    },
  });
}

// ── Cancelar uma emissão ─────────────────────────────────────────────────────
export function useCancelNfse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, planId }: { id: string; planId: string }) => {
      const { error } = await supabase
        .from("nfse_emissions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return planId;
    },
    onSuccess: (planId) => {
      queryClient.invalidateQueries({ queryKey: NFSE_KEY(planId) });
      toast.success("Solicitação cancelada.");
    },
    onError: () => toast.error("Erro ao cancelar NFS-e"),
  });
}
