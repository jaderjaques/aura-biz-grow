import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { 
  SavedReport, 
  OverviewMetrics, 
  FunnelStage, 
  LeadSourcePerformance, 
  TeamMemberPerformance,
  RevenueDataPoint,
  MrrMovement,
  LtvCacMetrics
} from "@/types/reports";

export function useSavedReports() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["saved-reports", user?.id],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_reports")
        .select("*")
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SavedReport[];
    },
    enabled: !!user
  });
}

export function useCreateSavedReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (report: { name: string; report_type: string; config: Json; description?: string }) => {
      const { data, error } = await supabase
        .from("saved_reports")
        .insert([{
          name: report.name,
          report_type: report.report_type,
          config: report.config,
          description: report.description,
          user_id: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-reports"] });
      toast.success("Relatório salvo com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar relatório: " + error.message);
    }
  });
}

export function useToggleFavoriteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from("saved_reports")
        .update({ is_favorite: isFavorite })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-reports"] });
    }
  });
}

export function useDeleteSavedReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("saved_reports")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-reports"] });
      toast.success("Relatório excluído!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir relatório: " + error.message);
    }
  });
}

export function useOverviewMetrics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["overview-metrics", user?.id],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async (): Promise<OverviewMetrics> => {
      // Fetch leads count
      const { count: totalLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });

      const { count: convertedLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "convertido");

      // Fetch MRR from customers
      const { data: customers } = await supabase
        .from("customers")
        .select("monthly_value")
        .eq("status", "active");

      const mrr = customers?.reduce((sum, c) => sum + (Number(c.monthly_value) || 0), 0) || 0;

      // Fetch average deal value
      const { data: wonDeals } = await supabase
        .from("deals")
        .select("total_value")
        .eq("status", "won");

      const avgDealValue = wonDeals && wonDeals.length > 0
        ? wonDeals.reduce((sum, d) => sum + (Number(d.total_value) || 0), 0) / wonDeals.length
        : 0;

      const conversionRate = totalLeads && totalLeads > 0 
        ? ((convertedLeads || 0) / totalLeads) * 100 
        : 0;

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

      const { count: leadsThis } = await supabase.from("leads")
        .select("*", { count: "exact", head: true }).gte("created_at", thisMonthStart);
      const { count: leadsLast } = await supabase.from("leads")
        .select("*", { count: "exact", head: true }).gte("created_at", lastMonthStart).lt("created_at", thisMonthStart);
      const leadsGrowth = (leadsLast || 0) > 0
        ? (((leadsThis || 0) - (leadsLast || 0)) / (leadsLast || 1)) * 100 : 0;

      const { count: convThis } = await supabase.from("leads")
        .select("*", { count: "exact", head: true }).eq("status", "convertido").gte("created_at", thisMonthStart);
      const { count: convLast } = await supabase.from("leads")
        .select("*", { count: "exact", head: true }).eq("status", "convertido").gte("created_at", lastMonthStart).lt("created_at", thisMonthStart);
      const rateThis = (leadsThis || 0) > 0 ? ((convThis || 0) / (leadsThis || 1)) * 100 : 0;
      const rateLast = (leadsLast || 0) > 0 ? ((convLast || 0) / (leadsLast || 1)) * 100 : 0;
      const conversionGrowth = rateLast > 0 ? rateThis - rateLast : 0;

      const { data: wonThis } = await supabase.from("deals")
        .select("total_value").eq("status", "won").gte("actual_close_date", thisMonthStart.slice(0, 10));
      const { data: wonLast } = await supabase.from("deals")
        .select("total_value").eq("status", "won").gte("actual_close_date", lastMonthStart.slice(0, 10)).lt("actual_close_date", thisMonthStart.slice(0, 10));
      const avgThis = wonThis && wonThis.length ? wonThis.reduce((s, d) => s + (Number(d.total_value) || 0), 0) / wonThis.length : 0;
      const avgLast = wonLast && wonLast.length ? wonLast.reduce((s, d) => s + (Number(d.total_value) || 0), 0) / wonLast.length : 0;
      const ticketGrowth = avgLast > 0 ? ((avgThis - avgLast) / avgLast) * 100 : 0;

      return {
        totalLeads: totalLeads || 0,
        leadsGrowth: Math.round(leadsGrowth * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
        conversionGrowth: Math.round(conversionGrowth * 10) / 10,
        mrr,
        mrrGrowth: 0, // requer histórico de MRR (metrics_snapshots) — Fase 1.4
        avgDealValue,
        ticketGrowth: Math.round(ticketGrowth * 10) / 10
      };
    },
    enabled: !!user
  });
}

export function useSalesFunnel() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sales-funnel", user?.id],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async (): Promise<FunnelStage[]> => {
      const stages = ['proposta', 'negociacao', 'fechamento', 'won'];
      const result: FunnelStage[] = [];

      for (const stage of stages) {
        const { data, error } = await supabase
          .from("deals")
          .select("total_value")
          .eq("status", "open")
          .eq("stage", stage);

        if (error) throw error;

        const stageLabels: Record<string, string> = {
          proposta: 'Proposta',
          negociacao: 'Negociação',
          fechamento: 'Fechamento',
          won: 'Ganho'
        };

        result.push({
          name: stageLabels[stage] || stage,
          count: data?.length || 0,
          value: data?.reduce((sum, d) => sum + (Number(d.total_value) || 0), 0) || 0
        });
      }

      return result;
    },
    enabled: !!user
  });
}

export function useLeadSourcePerformance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lead-source-performance", user?.id],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async (): Promise<LeadSourcePerformance[]> => {
      const { data: leads, error } = await supabase
        .from("leads")
        .select("source, status");

      if (error) throw error;

      const sourceMap = new Map<string, { total: number; qualified: number; converted: number }>();

      leads?.forEach(lead => {
        const source = lead.source || 'Desconhecido';
        const current = sourceMap.get(source) || { total: 0, qualified: 0, converted: 0 };
        current.total++;
        if (lead.status === 'qualificado') current.qualified++;
        if (lead.status === 'convertido') current.converted++;
        sourceMap.set(source, current);
      });

      return Array.from(sourceMap.entries())
        .map(([source, data]) => ({
          source,
          totalLeads: data.total,
          qualifiedLeads: data.qualified,
          convertedLeads: data.converted,
          conversionRate: data.total > 0 ? (data.converted / data.total) * 100 : 0
        }))
        .sort((a, b) => b.conversionRate - a.conversionRate);
    },
    enabled: !!user
  });
}

export function useTeamPerformance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["team-performance", user?.id],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async (): Promise<TeamMemberPerformance[]> => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (profilesError) throw profilesError;

      const results: TeamMemberPerformance[] = [];

      for (const profile of profiles || []) {
        const { count: totalLeads } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("assigned_to", profile.id);

        const { count: convertedLeads } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("assigned_to", profile.id)
          .eq("status", "convertido");

        const { count: totalDeals } = await supabase
          .from("deals")
          .select("*", { count: "exact", head: true })
          .eq("assigned_to", profile.id);

        const { data: wonDealsData } = await supabase
          .from("deals")
          .select("total_value")
          .eq("assigned_to", profile.id)
          .eq("status", "won");

        const wonDeals = wonDealsData?.length || 0;
        const revenue = wonDealsData?.reduce((sum, d) => sum + (Number(d.total_value) || 0), 0) || 0;

        if ((totalLeads || 0) > 0 || (totalDeals || 0) > 0) {
          results.push({
            id: profile.id,
            name: profile.full_name,
            totalLeads: totalLeads || 0,
            convertedLeads: convertedLeads || 0,
            totalDeals: totalDeals || 0,
            wonDeals,
            revenue,
            conversionRate: (totalLeads || 0) > 0 
              ? ((convertedLeads || 0) / (totalLeads || 1)) * 100 
              : 0
          });
        }
      }

      return results.sort((a, b) => b.revenue - a.revenue);
    },
    enabled: !!user
  });
}

export function useRevenueData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-data", user?.id],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async (): Promise<RevenueDataPoint[]> => {
      const now = new Date();
      const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const { data: invoices } = await supabase
        .from("invoices")
        .select("total_amount, issue_date")
        .gte("issue_date", start.toISOString().slice(0, 10));

      const points: RevenueDataPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const receita = (invoices || [])
          .filter((inv) => {
            if (!inv.issue_date) return false;
            const id = new Date(inv.issue_date);
            return id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear();
          })
          .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
        points.push({ month: monthNames[d.getMonth()], receita, mrr: 0 });
      }
      return points;
    },
    enabled: !!user
  });
}

export function useFinancialMetrics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["financial-metrics", user?.id],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async () => {
      const { data: customers } = await supabase
        .from("customers")
        .select("monthly_value, status");

      const activeCustomers = customers?.filter(c => c.status === 'active') || [];
      const mrr = activeCustomers.reduce((sum, c) => sum + (Number(c.monthly_value) || 0), 0);
      const arr = mrr * 12;

      const { count: totalCustomers } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      const { count: cancelledThisMonth } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("status", "cancelled")
        .gte("updated_at", new Date(new Date().setDate(1)).toISOString());

      const churnRate = (totalCustomers || 0) > 0 
        ? ((cancelledThisMonth || 0) / (totalCustomers || 1)) * 100 
        : 0;

      return {
        mrr,
        arr,
        churnRate: Math.round(churnRate * 10) / 10,
        totalCustomers: totalCustomers || 0
      };
    },
    enabled: !!user
  });
}

export function useMrrMovement(): { data: MrrMovement | undefined; isLoading: boolean } {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mrr-movement", user?.id],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async (): Promise<MrrMovement> => {
      // MRR atual real; componentes de movimento exigem histórico (metrics_snapshots) — Fase 1.4
      const { data: customers } = await supabase
        .from("customers")
        .select("monthly_value")
        .eq("status", "active");
      const current = customers?.reduce((sum, c) => sum + (Number(c.monthly_value) || 0), 0) || 0;
      return { previous: 0, new: 0, expansion: 0, churn: 0, current };
    },
    enabled: !!user
  });
}

export function useLtvCacMetrics(): { data: LtvCacMetrics | undefined; isLoading: boolean } {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ltv-cac-metrics", user?.id],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async (): Promise<LtvCacMetrics> => {
      const { data: customers } = await supabase
        .from("customers")
        .select("lifetime_value")
        .eq("status", "active");

      const avgLtv = customers && customers.length > 0
        ? customers.reduce((sum, c) => sum + (Number(c.lifetime_value) || 0), 0) / customers.length
        : 0;

      // CAC requer dado de gasto de marketing (sem fonte ainda) → 0 até integrar
      const cac = 0;

      return {
        ltv: avgLtv,
        cac,
        ratio: cac > 0 ? avgLtv / cac : 0
      };
    },
    enabled: !!user
  });
}

export function usePipelineByStage() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pipeline-by-stage", user?.id],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("stage, total_value")
        .eq("status", "open");

      if (error) throw error;

      const stageMap = new Map<string, number>();
      data?.forEach(deal => {
        const stage = deal.stage || 'Outros';
        const current = stageMap.get(stage) || 0;
        stageMap.set(stage, current + (Number(deal.total_value) || 0));
      });

      return Array.from(stageMap.entries()).map(([name, value]) => ({
        name,
        value
      }));
    },
    enabled: !!user
  });
}
