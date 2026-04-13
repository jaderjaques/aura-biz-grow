import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ApiKey, Webhook, MessageTemplate, IntegrationLog, IntegrationSetting } from "@/types/integrations";
import { getCurrentProfile } from "@/lib/tenant-utils";

// API Keys hooks
export function useApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ApiKey[];
    },
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { key_name: string; scopes: string[]; expires_at?: string }) => {
      const profile = await getCurrentProfile();

      // Generate API key with secure random bytes
      const apiKey = `rua_${crypto.randomUUID().replace(/-/g, "")}`;
      
      // SECURITY: Create hash of the API key for storage
      // The plain key is only shown once to the user, then only the hash is stored
      const encoder = new TextEncoder();
      const keyData = encoder.encode(apiKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Extract prefix for identification (first 12 chars: rua_xxxxxxxx)
      const apiKeyPrefix = apiKey.substring(0, 12);

      const { data: result, error } = await supabase
        .from("api_keys")
        .insert({
          user_id: profile.id,
          tenant_id: profile.tenant_id,
          key_name: data.key_name,
          api_key: apiKeyPrefix + '...', // Store only truncated version for display
          api_key_hash: apiKeyHash,       // Store hash for validation
          api_key_prefix: apiKeyPrefix,   // Store prefix for identification
          scopes: data.scopes,
          expires_at: data.expires_at || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Return the full API key for one-time display to user
      // This is the only time the full key is available
      return { ...result, api_key: apiKey } as ApiKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API Key criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar API Key: " + error.message);
    },
  });
}

export function useToggleApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("api_keys")
        .update({ active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("Status da API Key atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar API Key: " + error.message);
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API Key deletada!");
    },
    onError: (error) => {
      toast.error("Erro ao deletar API Key: " + error.message);
    },
  });
}

// Webhooks hooks
export function useWebhooks() {
  return useQuery({
    queryKey: ["webhooks"],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Webhook[];
    },
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      name: string; 
      url: string; 
      events: string[]; 
      auth_type?: string;
      auth_config?: Record<string, string>;
    }) => {
      const profile = await getCurrentProfile();

      const { data: result, error } = await supabase
        .from("webhooks")
        .insert({
          user_id: profile.id,
          tenant_id: profile.tenant_id,
          name: data.name,
          url: data.url,
          events: data.events,
          auth_type: data.auth_type || "none",
          auth_config: data.auth_config || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result as Webhook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar webhook: " + error.message);
    },
  });
}

export function useToggleWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("webhooks")
        .update({ active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Status do webhook atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar webhook: " + error.message);
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("webhooks")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deletado!");
    },
    onError: (error) => {
      toast.error("Erro ao deletar webhook: " + error.message);
    },
  });
}

// Message Templates hooks
export function useMessageTemplates() {
  return useQuery({
    queryKey: ["message-templates"],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MessageTemplate[];
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      template_type: string;
      subject?: string;
      body: string;
      category?: string;
    }) => {
      const profile = await getCurrentProfile();

      const { data: result, error } = await supabase
        .from("message_templates")
        .insert({
          ...data,
          created_by: profile.id,
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;
      return result as MessageTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast.success("Template criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar template: " + error.message);
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("message_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast.success("Template deletado!");
    },
    onError: (error) => {
      toast.error("Erro ao deletar template: " + error.message);
    },
  });
}

// Integration Logs hooks
export function useIntegrationLogs(integrationType?: string) {
  return useQuery({
    queryKey: ["integration-logs", integrationType],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async () => {
      let query = supabase
        .from("integration_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (integrationType && integrationType !== "all") {
        query = query.eq("integration_type", integrationType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as IntegrationLog[];
    },
  });
}

// Integration Settings hooks
export function useIntegrationSettings() {
  return useQuery({
    queryKey: ["integration-settings"],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_settings")
        .select("*");

      if (error) throw error;
      return data as IntegrationSetting[];
    },
  });
}

export function useUpsertIntegrationSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      integration_name: string;
      config: Record<string, string>;
      active?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: result, error } = await supabase
        .from("integration_settings")
        .upsert({
          integration_name: data.integration_name,
          config: data.config,
          active: data.active ?? false,
          updated_by: user.id,
        }, {
          onConflict: "integration_name",
        })
        .select()
        .single();

      if (error) throw error;
      return result as IntegrationSetting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-settings"] });
      toast.success("Configuração salva!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar configuração: " + error.message);
    },
  });
}
