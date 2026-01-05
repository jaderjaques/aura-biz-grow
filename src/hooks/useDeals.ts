import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Deal, DealWithDetails, DealProduct, SelectedProduct } from "@/types/products";

export function useDeals() {
  const [deals, setDeals] = useState<DealWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          lead:leads(id, company_name, contact_name, phone, email),
          assigned_user:profiles!deals_assigned_to_fkey(id, full_name, avatar_url),
          deal_products(*, product:products(*))
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeals(data as DealWithDetails[] || []);
    } catch (error: any) {
      console.error("Error fetching deals:", error);
      toast({
        title: "Erro ao carregar propostas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const createDeal = async (
    dealData: Partial<Deal>,
    products: SelectedProduct[]
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create deal
      const { data: deal, error: dealError } = await supabase
        .from("deals")
        .insert({
          ...dealData,
          created_by: user?.id,
          assigned_to: dealData.assigned_to || user?.id,
        } as any)
        .select()
        .single();

      if (dealError) throw dealError;

      // Add products to deal
      if (products.length > 0) {
        const dealProducts = products.map((p) => ({
          deal_id: deal.id,
          product_id: p.product.id,
          quantity: p.quantity,
          unit_price: p.unit_price,
          discount_percent: p.discount_percent,
          discount_amount: p.discount_amount,
        }));

        const { error: productsError } = await supabase
          .from("deal_products")
          .insert(dealProducts as any);

        if (productsError) throw productsError;
      }

      toast({
        title: "Proposta criada!",
        description: `${deal.deal_number} foi criada com sucesso`,
      });

      await fetchDeals();
      return deal;
    } catch (error: any) {
      console.error("Error creating deal:", error);
      toast({
        title: "Erro ao criar proposta",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateDeal = async (id: string, dealData: Partial<Deal>) => {
    try {
      const { data, error } = await supabase
        .from("deals")
        .update(dealData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Proposta atualizada!",
      });

      await fetchDeals();
      return data;
    } catch (error: any) {
      console.error("Error updating deal:", error);
      toast({
        title: "Erro ao atualizar proposta",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const markAsWon = async (id: string) => {
    try {
      await updateDeal(id, {
        status: "won",
        stage: "ganho",
        actual_close_date: new Date().toISOString().split("T")[0],
        closed_at: new Date().toISOString(),
        probability: 100,
      });

      toast({
        title: "🎉 Proposta ganha!",
        description: "A proposta foi marcada como ganha",
      });
    } catch (error) {
      // Error already handled
    }
  };

  const markAsLost = async (id: string, reason?: string) => {
    try {
      await updateDeal(id, {
        status: "lost",
        stage: "perdido",
        actual_close_date: new Date().toISOString().split("T")[0],
        closed_at: new Date().toISOString(),
        probability: 0,
        lost_reason: reason,
      });

      toast({
        title: "Proposta perdida",
        description: "A proposta foi marcada como perdida",
      });
    } catch (error) {
      // Error already handled
    }
  };

  const deleteDeal = async (id: string) => {
    try {
      const { error } = await supabase
        .from("deals")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Proposta excluída!",
      });

      await fetchDeals();
    } catch (error: any) {
      console.error("Error deleting deal:", error);
      toast({
        title: "Erro ao excluir proposta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getDealsByStage = (stage: string) => 
    deals.filter((d) => d.stage === stage);

  const getOpenDeals = () => deals.filter((d) => d.status === "open");
  const getWonDeals = () => deals.filter((d) => d.status === "won");
  const getLostDeals = () => deals.filter((d) => d.status === "lost");

  const getTotalValue = () => 
    deals.filter((d) => d.status === "open").reduce((sum, d) => sum + Number(d.total_value || 0), 0);

  const getWonThisMonth = () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return deals.filter(
      (d) => d.status === "won" && new Date(d.closed_at || "") >= firstDayOfMonth
    ).length;
  };

  const getConversionRate = () => {
    const closed = deals.filter((d) => d.status !== "open");
    if (closed.length === 0) return 0;
    const won = closed.filter((d) => d.status === "won").length;
    return Math.round((won / closed.length) * 100);
  };

  return {
    deals,
    loading,
    fetchDeals,
    createDeal,
    updateDeal,
    markAsWon,
    markAsLost,
    deleteDeal,
    getDealsByStage,
    getOpenDeals,
    getWonDeals,
    getLostDeals,
    getTotalValue,
    getWonThisMonth,
    getConversionRate,
  };
}
