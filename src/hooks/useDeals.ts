import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentProfile } from "@/lib/tenant-utils";
import { useToast } from "@/hooks/use-toast";
import { Deal, DealWithDetails, SelectedProduct } from "@/types/products";

const DEALS_KEY = ["deals"];

// ── query helper ──────────────────────────────────────────────────────────────

async function fetchDealsQuery(): Promise<DealWithDetails[]> {
  const { data, error } = await supabase
    .from("deals")
    .select(`
      *,
      assigned_user:profiles!deals_assigned_to_fkey(id, full_name, avatar_url),
      deal_products(*, product:products(*))
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const dealsData = data || [];
  const leadIds = [...new Set(dealsData.map(d => d.lead_id).filter(Boolean))] as string[];

  let leadsMap: Record<string, any> = {};
  if (leadIds.length > 0) {
    const { data: leadsData } = await supabase
      .from("leads")
      .select("id, company_name, trading_name, cnpj, segment, contact_name, position, phone, email")
      .in("id", leadIds);
    if (leadsData) leadsMap = Object.fromEntries(leadsData.map(l => [l.id, l]));
  }

  return dealsData.map(deal => ({
    ...deal,
    lead: deal.lead_id ? leadsMap[deal.lead_id] || null : null,
  })) as DealWithDetails[];
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function useDeals() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: deals = [], isLoading: loading } = useQuery<DealWithDetails[]>({
    queryKey: DEALS_KEY,
    queryFn: fetchDealsQuery,
    staleTime: 3 * 60_000,
  });

  const invalidate  = () => queryClient.invalidateQueries({ queryKey: DEALS_KEY });
  const fetchDeals  = () => invalidate();

  // ── Criar ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async ({ dealData, products }: { dealData: Partial<Deal>; products: SelectedProduct[] }) => {
      const profile = await getCurrentProfile();

      let setupValue = 0, recurringValue = 0, discountTotal = 0;
      products.forEach((p) => {
        const lineTotal   = p.quantity * p.unit_price;
        const lineDiscount = p.discount_amount || (lineTotal * (p.discount_percent || 0)) / 100;
        discountTotal += lineDiscount;
        if (p.product.type === "setup" || !p.product.is_recurring) setupValue    += lineTotal - lineDiscount;
        else                                                         recurringValue += lineTotal - lineDiscount;
      });

      const { data: deal, error: dealError } = await supabase
        .from("deals")
        .insert({
          ...dealData, stage: "proposta", status: "open",
          total_value: setupValue + recurringValue,
          setup_value: setupValue, recurring_value: recurringValue,
          discount_total: discountTotal,
          created_by: profile.id, assigned_to: dealData.assigned_to || profile.id,
          tenant_id: profile.tenant_id,
        } as any)
        .select().single();
      if (dealError) throw dealError;

      if (products.length > 0) {
        await supabase.from("deal_products").insert(
          products.map(p => ({
            deal_id: deal.id, product_id: p.product.id,
            quantity: p.quantity, unit_price: p.unit_price,
            discount_percent: p.discount_percent, discount_amount: p.discount_amount,
            tenant_id: profile.tenant_id,
          })) as any
        );
      }
      return deal;
    },
    onSuccess: (deal) => {
      toast({ title: "Proposta criada!", description: `${deal.deal_number} foi criada com sucesso` });
      invalidate();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar proposta", description: error.message, variant: "destructive" });
    },
  });

  const createDeal = (dealData: Partial<Deal>, products: SelectedProduct[]) =>
    createMutation.mutateAsync({ dealData, products });

  // ── Atualizar ────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Deal> }) => {
      const { data: updated, error } = await supabase.from("deals").update(data).eq("id", id).select().single();
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      toast({ title: "Proposta atualizada!" });
      invalidate();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar proposta", description: error.message, variant: "destructive" });
    },
  });

  const updateDeal = (id: string, data: Partial<Deal>) =>
    updateMutation.mutateAsync({ id, data });

  // ── Ganhar / Perder / Deletar ─────────────────────────────────────────────
  const markAsWon = async (id: string) => {
    await updateDeal(id, { status: "won", stage: "ganho", actual_close_date: new Date().toISOString().split("T")[0], closed_at: new Date().toISOString(), probability: 100 });
    toast({ title: "🎉 Proposta ganha!", description: "A proposta foi marcada como ganha" });
  };

  const markAsLost = async (id: string, reason?: string) => {
    await updateDeal(id, { status: "lost", stage: "perdido", actual_close_date: new Date().toISOString().split("T")[0], closed_at: new Date().toISOString(), probability: 0, lost_reason: reason });
    toast({ title: "Proposta perdida", description: "A proposta foi marcada como perdida" });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Proposta excluída!" });
      invalidate();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir proposta", description: error.message, variant: "destructive" });
    },
  });

  const deleteDeal = (id: string) => deleteMutation.mutateAsync(id);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getDealsByStage   = (stage: string) => deals.filter((d) => d.stage === stage);
  const getOpenDeals      = () => deals.filter((d) => d.status === "open");
  const getWonDeals       = () => deals.filter((d) => d.status === "won");
  const getLostDeals      = () => deals.filter((d) => d.status === "lost");
  const getTotalValue     = () => deals.filter((d) => d.status === "open").reduce((s, d) => s + Number(d.total_value || 0), 0);
  const getWonThisMonth   = () => {
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return deals.filter((d) => d.status === "won" && new Date(d.closed_at || "") >= firstDay).length;
  };
  const getConversionRate = () => {
    const closed = deals.filter((d) => d.status !== "open");
    if (!closed.length) return 0;
    return Math.round((closed.filter((d) => d.status === "won").length / closed.length) * 100);
  };

  return {
    deals, loading, fetchDeals,
    createDeal, updateDeal, markAsWon, markAsLost, deleteDeal,
    getDealsByStage, getOpenDeals, getWonDeals, getLostDeals,
    getTotalValue, getWonThisMonth, getConversionRate,
  };
}
