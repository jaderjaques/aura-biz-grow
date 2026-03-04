import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InvoiceWithDetails, PaymentWithDetails, FinancialAlert, FinancialMetrics } from "@/types/financial";

export const useInvoices = (filters?: {
  status?: string;
  type?: string;
  customerId?: string;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ["invoices", filters],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select(`
          *,
          customer:customers!invoices_customer_id_fkey(id, company_name, contact_name, email),
          contract:contracts!invoices_contract_id_fkey(id, contract_number, title)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.type && filters.type !== "all") {
        query = query.eq("invoice_type", filters.type);
      }
      if (filters?.customerId) {
        query = query.eq("customer_id", filters.customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InvoiceWithDetails[];
    },
  });

  const createInvoice = useMutation({
    mutationFn: async (invoice: {
      customer_id: string;
      contract_id?: string;
      invoice_type: string;
      amount: number;
      discount_amount?: number;
      tax_amount?: number;
      due_date: string;
      issue_date?: string;
      payment_method?: string;
      description?: string;
      is_recurring?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          ...invoice,
          invoice_number: "",
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["financial-metrics"] });
      toast({
        title: "Fatura criada!",
        description: "A fatura foi gerada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar fatura",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<InvoiceWithDetails>) => {
      const { data, error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["financial-metrics"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar fatura",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async ({
      invoiceId,
      paymentDate,
      paymentMethod,
      transactionId,
      notes,
      proofUrl,
    }: {
      invoiceId: string;
      paymentDate: string;
      paymentMethod: string;
      transactionId?: string;
      notes?: string;
      proofUrl?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get invoice to get customer_id and amount
      const { data: invoice } = await supabase
        .from("invoices")
        .select("customer_id, total_amount")
        .eq("id", invoiceId)
        .single();

      if (!invoice) throw new Error("Fatura não encontrada");

      // Create payment record
      await supabase.from("payments").insert({
        invoice_id: invoiceId,
        customer_id: invoice.customer_id,
        amount: invoice.total_amount,
        payment_date: paymentDate,
        confirmed_at: new Date().toISOString(),
        payment_method: paymentMethod,
        transaction_id: transactionId,
        notes,
        created_by: user?.id,
      });

      // Update invoice status
      const { data, error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          payment_date: paymentDate,
          payment_method: paymentMethod,
          payment_confirmation: transactionId,
          payment_proof_url: proofUrl || null,
        })
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["financial-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Pagamento confirmado!",
        description: "A fatura foi marcada como paga.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao confirmar pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase
        .from("invoices")
        .update({ status: "cancelled" })
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["financial-metrics"] });
      toast({
        title: "Fatura cancelada",
        description: "A fatura foi cancelada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao cancelar fatura",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    invoices,
    isLoading,
    refetch,
    createInvoice,
    updateInvoice,
    markAsPaid,
    cancelInvoice,
  };
};

export const useFinancialMetrics = () => {
  return useQuery({
    queryKey: ["financial-metrics"],
    queryFn: async (): Promise<FinancialMetrics> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get all invoices for metrics
      const { data: invoices } = await supabase
        .from("invoices")
        .select("*");

      const allInvoices = invoices || [];

      // Calculate MRR from active contracts
      const { data: customers } = await supabase
        .from("customers")
        .select("monthly_value")
        .eq("status", "active");

      const mrr = (customers || []).reduce((sum, c) => sum + (Number(c.monthly_value) || 0), 0);

      // Last month's MRR (simplified - using same calculation)
      const lastMonthMrr = mrr * 0.95; // Placeholder
      const mrrGrowth = lastMonthMrr > 0 ? ((mrr - lastMonthMrr) / lastMonthMrr) * 100 : 0;

      // Monthly revenue (paid invoices this month)
      const paidThisMonth = allInvoices.filter(
        (i) => i.status === "paid" && 
        i.payment_date && 
        new Date(i.payment_date) >= startOfMonth
      );
      const monthlyRevenue = paidThisMonth.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

      // Pending invoices
      const pendingInvoices = allInvoices.filter((i) => i.status === "pending" || i.status === "sent");
      const pendingAmount = pendingInvoices.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

      // Overdue invoices
      const today = new Date().toISOString().split("T")[0];
      const overdueInvoices = allInvoices.filter(
        (i) => (i.status === "pending" || i.status === "sent" || i.status === "overdue") && 
        i.due_date < today
      );
      const overdueAmount = overdueInvoices.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

      return {
        mrr,
        mrrGrowth: Math.round(mrrGrowth * 10) / 10,
        monthlyRevenue,
        invoicesPaid: paidThisMonth.length,
        pendingAmount,
        pendingCount: pendingInvoices.length,
        overdueAmount,
        overdueCount: overdueInvoices.length,
      };
    },
  });
};

export const usePayments = (customerId?: string) => {
  return useQuery({
    queryKey: ["payments", customerId],
    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select(`
          *,
          invoice:invoices(*),
          customer:customers(id, company_name)
        `)
        .order("payment_date", { ascending: false });

      if (customerId) {
        query = query.eq("customer_id", customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PaymentWithDetails[];
    },
  });
};

export const useFinancialAlerts = () => {
  const queryClient = useQueryClient();
  
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["financial-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_alerts")
        .select("*")
        .eq("action_taken", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as FinancialAlert[];
    },
  });

  const resolveAlert = useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("financial_alerts")
        .update({
          action_taken: true,
          action_taken_by: user?.id,
          action_taken_at: new Date().toISOString(),
          action_notes: notes,
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-alerts"] });
    },
  });

  return { alerts, isLoading, resolveAlert };
};
