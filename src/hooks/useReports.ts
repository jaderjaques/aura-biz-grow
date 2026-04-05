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

      return {
        totalLeads: totalLeads || 0,
        leadsGrowth: 12.5, // Mock - would need historical data
        conversionRate: Math.round(conversionRate * 10) / 10,
        conversionGrowth: 2.3, // Mock
        mrr,
        mrrGrowth: 8.2, // Mock
        avgDealValue,
        ticketGrowth: 15.0 // Mock
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
      // Mock data - in production, this would aggregate from invoices
      const months = ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return months.map((month, i) => ({
        month,
        receita: Math.round((50000 + Math.random() * 30000) * (1 + i * 0.1)),
        mrr: Math.round((30000 + Math.random() * 10000) * (1 + i * 0.05))
      }));
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
      // Mock data - would need historical MRR tracking
      return {
        previous: 45000,
        new: 8500,
        expansion: 2500,
        churn: 1500,
        current: 54500
      };
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
        : 5000;

      // Mock CAC - would need marketing spend data
      const cac = 1200;

      return {
        ltv: avgLtv || 5000,
        cac,
        ratio: avgLtv ? avgLtv / cac : 4.2
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
