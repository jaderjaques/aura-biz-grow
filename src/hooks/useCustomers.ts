import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CustomerWithDetails, ContractWithDetails, ContractTemplate } from "@/types/customers";
import { useToast } from "@/hooks/use-toast";

const CUSTOMERS_KEY  = ["customers"];
const CONTRACTS_KEY  = ["contracts"];
const TEMPLATES_KEY  = ["contract-templates"];

// ── query helpers ─────────────────────────────────────────────────────────────

async function fetchCustomersQuery(): Promise<CustomerWithDetails[]> {
  const { data, error } = await supabase
    .from("customers")
    .select(`
      *,
      account_manager_user:profiles!customers_account_manager_fkey(id, full_name, avatar_url),
      lead:leads(id, company_name)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CustomerWithDetails[]) ?? [];
}

// ── useCustomers ──────────────────────────────────────────────────────────────

export function useCustomers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Fase 1: lista leve — aparece rápido ────────────────────────────────
  const { data: quickCustomers = [], isLoading: loadingQuick } = useQuery({
    queryKey: [...CUSTOMERS_KEY, "quick"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, company_name, contact_name, status, monthly_value, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as Partial<CustomerWithDetails>[];
    },
    staleTime: 2 * 60_000,
  });

  // ── Fase 2: clientes completos com joins (background) ─────────────────
  const { data: fullCustomers } = useQuery({
    queryKey: [...CUSTOMERS_KEY, "full"],
    queryFn: fetchCustomersQuery,
    staleTime: 3 * 60_000,
    enabled: !loadingQuick,
  });

  const customers = (fullCustomers ?? quickCustomers) as CustomerWithDetails[];
  const loading   = loadingQuick;

  // ── Templates com cache longo ──────────────────────────────────────────
  const { data: templates = [] } = useQuery<ContractTemplate[]>({
    queryKey: TEMPLATES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("active", true)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60_000,
  });

  const invalidate       = () => queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
  const fetchCustomers   = () => invalidate();
  const fetchTemplates   = () => queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });

  // ── Criar ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (customerData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user!.id)
        .single();
      const { data, error } = await supabase
        .from("customers")
        .insert({ ...customerData, created_by: user?.id, tenant_id: profile?.tenant_id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Cliente criado! 🎉", description: `${data.company_name} foi adicionado aos clientes.` });
      invalidate();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar cliente", description: error.message, variant: "destructive" });
    },
  });

  const createCustomer = (data: any) => createMutation.mutateAsync(data);

  // ── Atualizar ────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from("customers").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Cliente atualizado", description: "As informações foram salvas." });
      invalidate();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar cliente", description: error.message, variant: "destructive" });
    },
  });

  const updateCustomer = (id: string, data: any) => updateMutation.mutateAsync({ id, data });

  const getActiveCustomers = () => customers.filter((c) => c.status === "active");
  const getTotalMRR  = () => customers.filter((c) => c.status === "active").reduce((s, c) => s + Number(c.monthly_value || 0), 0);
  const getTotalLTV  = () => customers.reduce((s, c) => s + Number(c.lifetime_value || 0), 0);
  const getAvgLTV    = () => customers.length === 0 ? 0 : getTotalLTV() / customers.length;

  return {
    customers, templates, loading,
    fetchCustomers, fetchTemplates,
    createCustomer, updateCustomer,
    getActiveCustomers, getTotalMRR, getTotalLTV, getAvgLTV,
  };
}

// ── useContracts ──────────────────────────────────────────────────────────────

export function useContracts(customerId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const KEY = [...CONTRACTS_KEY, customerId ?? "all"];

  const { data: contracts = [], isLoading: loading } = useQuery<ContractWithDetails[]>({
    queryKey: KEY,
    queryFn: async () => {
      let query = supabase
        .from("contracts")
        .select(`*, customer:customers(id, company_name, contact_name, cnpj), template:contract_templates(id, name)`)
        .order("created_at", { ascending: false });
      if (customerId) query = query.eq("customer_id", customerId);
      const { data, error } = await query;
      if (error) throw error;
      return (data as ContractWithDetails[]) ?? [];
    },
    staleTime: 3 * 60_000,
  });

  const invalidate     = () => queryClient.invalidateQueries({ queryKey: KEY });
  const fetchContracts = () => invalidate();

  // ── Criar ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (contractData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user!.id)
        .single();
      const { data, error } = await supabase
        .from("contracts")
        .insert({ ...contractData, created_by: user?.id, tenant_id: profile?.tenant_id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Contrato criado!", description: `${data.contract_number} foi criado com sucesso.` });
      invalidate();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar contrato", description: error.message, variant: "destructive" });
    },
  });

  const createContract = (data: any) => createMutation.mutateAsync(data);

  // ── Atualizar status ──────────────────────────────────────────────────────
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, extra }: { id: string; status: string; extra?: any }) => {
      const { error } = await supabase.from("contracts").update({ status, ...extra }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast({ title: "Contrato atualizado", description: `Status alterado para ${status}.` });
      invalidate();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar contrato", description: error.message, variant: "destructive" });
    },
  });

  const updateContractStatus = (id: string, status: string, additionalData?: any) =>
    updateStatusMutation.mutateAsync({ id, status, extra: additionalData });

  // ── Assinar ───────────────────────────────────────────────────────────────
  const signMutation = useMutation({
    mutationFn: async ({ id, signatureData }: { id: string; signatureData: any }) => {
      const { error } = await supabase.from("contracts").update({
        status: "signed",
        signed_date:              new Date().toISOString().split("T")[0],
        signature_type:           signatureData.type,
        signature_data:           signatureData.data,
        signed_by_customer_name:  signatureData.signerName,
        signed_by_customer_cpf:   signatureData.signerCPF,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Contrato assinado! ✅", description: "A assinatura foi registrada com sucesso." });
      invalidate();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao registrar assinatura", description: error.message, variant: "destructive" });
    },
  });

  const signContract = (id: string, signatureData: any) => signMutation.mutateAsync({ id, signatureData });

  const getActiveContracts   = () => contracts.filter((c) => c.status === "active" || c.status === "signed");
  const getExpiringContracts = () => contracts.filter((c) => {
    if (c.status !== "active" || !c.next_renewal_date) return false;
    const days = Math.ceil((new Date(c.next_renewal_date).getTime() - Date.now()) / 86400000);
    return days <= 30 && days > 0;
  });

  return {
    contracts, loading,
    fetchContracts, createContract, updateContractStatus, signContract,
    getActiveContracts, getExpiringContracts,
  };
}
