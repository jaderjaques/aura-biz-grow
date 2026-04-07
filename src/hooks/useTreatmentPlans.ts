import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  TreatmentPlan, TreatmentPlanItem,
  TreatmentPlanWithDetails, TreatmentPlanStatus, ClinicProcedure,
} from "@/types/treatmentPlans";
import { toast } from "sonner";

const PLANS_KEY      = ["treatment-plans"];
const PROCEDURES_KEY = ["procedures"];

// ── query helpers ─────────────────────────────────────────────────────────────

async function fetchPlansQuery(): Promise<TreatmentPlanWithDetails[]> {
  const { data, error } = await supabase
    .from("treatment_plans")
    .select(`*, patient:patients(full_name, phone), insurance:insurances(name)`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as TreatmentPlanWithDetails[]) ?? [];
}

async function fetchProceduresQuery(): Promise<ClinicProcedure[]> {
  const { data, error } = await supabase
    .from("procedures")
    .select("id, code, name, category, module, duration_minutes, sessions_default, price_private, tooth_region, body_area")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return (data as ClinicProcedure[]) ?? [];
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function useTreatmentPlans() {
  const queryClient = useQueryClient();

  // ── Fase 1: planos recentes (leve) — aparece rápido ────────────────────
  const { data: quickPlans = [], isLoading: loadingQuick } = useQuery({
    queryKey: [...PLANS_KEY, "quick"],
    queryFn: async () => {
      const { data } = await supabase
        .from("treatment_plans")
        .select("id, plan_number, status, patient_id, final_value, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as Partial<TreatmentPlanWithDetails>[];
    },
    staleTime: 2 * 60_000,
  });

  // ── Fase 2: planos completos com joins — background ────────────────────
  const { data: fullPlans, isFetching: fetchingPlans } = useQuery({
    queryKey: [...PLANS_KEY, "full"],
    queryFn: fetchPlansQuery,
    staleTime: 3 * 60_000,
    enabled: !loadingQuick,
  });

  const plans   = (fullPlans ?? quickPlans) as TreatmentPlanWithDetails[];
  const loading = loadingQuick;

  // ── Procedimentos com cache longo ───────────────────────────────────────
  const { data: procedures = [] } = useQuery<ClinicProcedure[]>({
    queryKey: PROCEDURES_KEY,
    queryFn: fetchProceduresQuery,
    staleTime: 10 * 60_000,
  });

  const invalidatePlans = () => queryClient.invalidateQueries({ queryKey: PLANS_KEY });

  // ── Itens de um plano ────────────────────────────────────────────────────
  const fetchPlanItems = async (planId: string): Promise<TreatmentPlanItem[]> => {
    const { data, error } = await supabase
      .from("treatment_plan_items")
      .select(`*, procedure:procedures(name, category)`)
      .eq("treatment_plan_id", planId)
      .order("execution_order");
    if (error) return [];
    return data as TreatmentPlanItem[];
  };

  // ── Criar plano ───────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async ({
      planData,
      items,
    }: {
      planData: Partial<TreatmentPlan>;
      items: Partial<TreatmentPlanItem>[];
    }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id, id")
        .single();
      if (!profile) throw new Error("Profile not found");

      const { count } = await supabase
        .from("treatment_plans")
        .select("id", { count: "exact", head: true });

      const planNumber = `ORC-${String((count ?? 0) + 1).padStart(4, "0")}`;

      const { data: plan, error: planError } = await supabase
        .from("treatment_plans")
        .insert({
          ...planData,
          tenant_id: profile.tenant_id,
          professional_id: profile.id,
          created_by: profile.id,
          plan_number: planNumber,
          created_date: new Date().toISOString().split("T")[0],
          status: planData.status ?? "draft",
        })
        .select()
        .single();

      if (planError) throw planError;

      if (items.length > 0) {
        const itemsPayload = items.map((item, idx) => ({
          ...item,
          treatment_plan_id: plan.id,
          execution_order: item.execution_order ?? idx + 1,
          sessions_completed: 0,
          status: "pending",
        }));
        await supabase.from("treatment_plan_items").insert(itemsPayload);
      }

      return { plan, planNumber };
    },
    onSuccess: ({ planNumber }) => {
      toast.success(`Orçamento ${planNumber} criado!`);
      invalidatePlans();
    },
    onError: () => toast.error("Erro ao criar orçamento"),
  });

  const createPlan = (planData: Partial<TreatmentPlan>, items: Partial<TreatmentPlanItem>[]) =>
    createMutation.mutateAsync({ planData, items }).then((r) => r.plan);

  // ── Atualizar plano ───────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TreatmentPlan> }) => {
      const { error } = await supabase
        .from("treatment_plans")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orçamento atualizado!");
      invalidatePlans();
    },
    onError: () => toast.error("Erro ao atualizar orçamento"),
  });

  const updatePlan = (id: string, data: Partial<TreatmentPlan>) =>
    updateMutation.mutateAsync({ id, data });

  // ── Progresso de item ─────────────────────────────────────────────────────
  const updateItemProgress = async (
    itemId: string,
    sessionsCompleted: number,
    status: string
  ) => {
    const { error } = await supabase
      .from("treatment_plan_items")
      .update({ sessions_completed: sessionsCompleted, status })
      .eq("id", itemId);
    if (error) {
      toast.error("Erro ao atualizar progresso");
      throw error;
    }
  };

  // ── Mudar status ──────────────────────────────────────────────────────────
  const changeStatus = async (id: string, status: TreatmentPlanStatus) => {
    const extra: Partial<TreatmentPlan> = {};
    const today = new Date().toISOString().split("T")[0];
    if (status === "approved")    extra.approved_date  = today;
    if (status === "in_progress") extra.start_date     = today;
    if (status === "completed")   extra.completed_date = today;
    await updatePlan(id, { status, ...extra });
    toast.success("Status atualizado!");
  };

  // ── Deletar ───────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("treatment_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orçamento removido");
      invalidatePlans();
    },
    onError: () => toast.error("Erro ao remover orçamento"),
  });

  const deletePlan = (id: string) => deleteMutation.mutateAsync(id);

  const getByStatus = (status: TreatmentPlanStatus) =>
    plans.filter((p) => p.status === status);

  const totalValue = plans
    .filter((p) => p.status !== "cancelled")
    .reduce((sum, p) => sum + (p.final_value ?? 0), 0);

  return {
    plans,
    procedures,
    loading,
    fetchingPlans,
    totalValue,
    createPlan,
    updatePlan,
    updateItemProgress,
    changeStatus,
    deletePlan,
    fetchPlanItems,
    getByStatus,
    refetch: invalidatePlans,
  };
}
