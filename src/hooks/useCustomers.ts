import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CustomerWithDetails, ContractWithDetails, ContractTemplate } from "@/types/customers";
import { useToast } from "@/hooks/use-toast";

export function useCustomers() {
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          account_manager_user:profiles!customers_account_manager_fkey(id, full_name, avatar_url),
          lead:leads(id, company_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data as CustomerWithDetails[]);
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("active", true)
        .order("is_default", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchTemplates();
  }, []);

  const createCustomer = async (customerData: any) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("customers")
        .insert({
          ...customerData,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Cliente criado! 🎉",
        description: `${data.company_name} foi adicionado aos clientes.`,
      });

      await fetchCustomers();
      return data;
    } catch (error: any) {
      console.error("Error creating customer:", error);
      toast({
        title: "Erro ao criar cliente",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateCustomer = async (id: string, customerData: any) => {
    try {
      const { error } = await supabase
        .from("customers")
        .update(customerData)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Cliente atualizado",
        description: "As informações foram salvas.",
      });

      await fetchCustomers();
    } catch (error: any) {
      console.error("Error updating customer:", error);
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const getActiveCustomers = () => customers.filter((c) => c.status === "active");
  
  const getTotalMRR = () =>
    customers
      .filter((c) => c.status === "active")
      .reduce((sum, c) => sum + Number(c.monthly_value || 0), 0);

  const getTotalLTV = () =>
    customers.reduce((sum, c) => sum + Number(c.lifetime_value || 0), 0);

  const getAvgLTV = () => {
    if (customers.length === 0) return 0;
    return getTotalLTV() / customers.length;
  };

  return {
    customers,
    templates,
    loading,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    getActiveCustomers,
    getTotalMRR,
    getTotalLTV,
    getAvgLTV,
  };
}

export function useContracts(customerId?: string) {
  const [contracts, setContracts] = useState<ContractWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchContracts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("contracts")
        .select(`
          *,
          customer:customers(id, company_name, contact_name, cnpj),
          template:contract_templates(id, name)
        `)
        .order("created_at", { ascending: false });

      if (customerId) {
        query = query.eq("customer_id", customerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContracts(data as ContractWithDetails[]);
    } catch (error: any) {
      console.error("Error fetching contracts:", error);
      toast({
        title: "Erro ao carregar contratos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [customerId]);

  const createContract = async (contractData: any) => {
    try {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("contracts")
        .insert({
          ...contractData,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Contrato criado!",
        description: `${data.contract_number} foi criado com sucesso.`,
      });

      await fetchContracts();
      return data;
    } catch (error: any) {
      console.error("Error creating contract:", error);
      toast({
        title: "Erro ao criar contrato",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateContractStatus = async (id: string, status: string, additionalData?: any) => {
    try {
      const { error } = await supabase
        .from("contracts")
        .update({ status, ...additionalData })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Contrato atualizado",
        description: `Status alterado para ${status}.`,
      });

      await fetchContracts();
    } catch (error: any) {
      console.error("Error updating contract:", error);
      toast({
        title: "Erro ao atualizar contrato",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signContract = async (id: string, signatureData: any) => {
    try {
      const { error } = await supabase
        .from("contracts")
        .update({
          status: "signed",
          signed_date: new Date().toISOString().split("T")[0],
          signature_type: signatureData.type,
          signature_data: signatureData.data,
          signed_by_customer_name: signatureData.signerName,
          signed_by_customer_cpf: signatureData.signerCPF,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Contrato assinado! ✅",
        description: "A assinatura foi registrada com sucesso.",
      });

      await fetchContracts();
    } catch (error: any) {
      console.error("Error signing contract:", error);
      toast({
        title: "Erro ao registrar assinatura",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const getActiveContracts = () => contracts.filter((c) => c.status === "active" || c.status === "signed");
  
  const getExpiringContracts = () =>
    contracts.filter((c) => {
      if (c.status !== "active" || !c.next_renewal_date) return false;
      const renewalDate = new Date(c.next_renewal_date);
      const now = new Date();
      const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 30 && daysUntil > 0;
    });

  return {
    contracts,
    loading,
    fetchContracts,
    createContract,
    updateContractStatus,
    signContract,
    getActiveContracts,
    getExpiringContracts,
  };
}
