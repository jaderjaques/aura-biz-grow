import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  TreatmentPlan,
  TreatmentPlanItem,
  TreatmentPlanWithDetails,
  TreatmentPlanStatus,
  ClinicProcedure,
} from "@/types/treatmentPlans";
import { toast } from "sonner";

export function useTreatmentPlans() {
  const [plans, setPlans] = useState<TreatmentPlanWithDetails[]>([]);
  const [procedures, setProcedures] = useState<ClinicProcedure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [plansRes, procsRes] = await Promise.all([
        supabase
          .from("treatment_plans")
          .select(`
            *,
            patient:patients(full_name, phone),
            insurance:insurances(name)
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("procedures")
          .select("id, code, name, category, module, duration_minutes, sessions_default, price_private, tooth_region, body_area")
          .eq("active", true)
          .order("name"),
      ]);

      if (plansRes.data) setPlans(plansRes.data as TreatmentPlanWithDetails[]);
      if (procsRes.data) setProcedures(procsRes.data as ClinicProcedure[]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanItems = async (planId: string): Promise<TreatmentPlanItem[]> => {
    const { data, error } = await supabase
      .from("treatment_plan_items")
      .select(`*, procedure:procedures(name, category)`)
      .eq("treatment_plan_id", planId)
      .order("execution_order");

    if (error) return [];
    return data as TreatmentPlanItem[];
  };

  const createPlan = async (
    planData: Partial<TreatmentPlan>,
    items: Partial<TreatmentPlanItem>[]
  ) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, id")
      .single();

    if (!profile) throw new Error("Profile not found");

    // Generate plan number
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

    if (planError) {
      toast.error("Erro ao criar orçamento");
      throw planError;
    }

    if (items.length > 0) {
      const itemsPayload = items.map((item, idx) => ({
        ...item,
        treatment_plan_id: plan.id,
        execution_order: item.execution_order ?? idx + 1,
        sessions_completed: 0,
        status: "pending",
      }));

      const { error: itemsError } = await supabase
        .from("treatment_plan_items")
        .insert(itemsPayload);

      if (itemsError) {
        toast.error("Orçamento criado, mas erro ao salvar itens");
      }
    }

    toast.success(`Orçamento ${planNumber} criado!`);
    await fetchAll();
    return plan;
  };

  const updatePlan = async (id: string, data: Partial<TreatmentPlan>) => {
    const { error } = await supabase
      .from("treatment_plans")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar orçamento");
      throw error;
    }

    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p))
    );
  };

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

  const changeStatus = async (id: string, status: TreatmentPlanStatus) => {
    const extra: Partial<TreatmentPlan> = {};
    const today = new Date().toISOString().split("T")[0];

    if (status === "approved") extra.approved_date = today;
    if (status === "in_progress") extra.start_date = today;
    if (status === "completed") extra.completed_date = today;

    await updatePlan(id, { status, ...extra });
    toast.success("Status atualizado!");
  };

  const deletePlan = async (id: string) => {
    const { error } = await supabase
      .from("treatment_plans")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao remover orçamento");
      throw error;
    }

    setPlans((prev) => prev.filter((p) => p.id !== id));
    toast.success("Orçamento removido");
  };

  const getByStatus = (status: TreatmentPlanStatus) =>
    plans.filter((p) => p.status === status);

  const totalValue = plans
    .filter((p) => p.status !== "cancelled")
    .reduce((sum, p) => sum + (p.final_value ?? 0), 0);

  return {
    plans,
    procedures,
    loading,
    totalValue,
    createPlan,
    updatePlan,
    updateItemProgress,
    changeStatus,
    deletePlan,
    fetchPlanItems,
    getByStatus,
    refetch: fetchAll,
  };
}
