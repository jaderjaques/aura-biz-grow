import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TenantWithStats {
  id: string;
  subdomain: string;
  name: string;
  logo_url: string | null;
  module: string;
  plan_tier: string | null;
  monthly_price: number | null;
  active: boolean;
  created_at: string;
  email: string | null;
  whatsapp_number: string | null;
  business_segment: string | null;
  settings: Record<string, any> | null;
  module_config: Record<string, any> | null;
  user_count?: number;
}

export interface CreateTenantInput {
  name: string;
  subdomain: string;
  module: string;
  plan_tier?: string;
  monthly_price?: number | null;
  email?: string;
  whatsapp_number?: string;
  business_segment?: string;
}

export function useSuperAdmin() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          setIsSuperAdmin(data?.is_super_admin ?? false);
          setLoading(false);
        });
    });
  }, []);

  return { isSuperAdmin, loading };
}

export interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  role: string | null;
  is_super_admin: boolean;
  is_active: boolean;
  status: string | null;
  created_at: string | null;
}

// Usuários de todas as empresas (só o super admin enxerga todos; o banco recusa as alterações de quem não é).
export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [profilesRes, tenantsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, tenant_id, role, is_super_admin, is_active, status, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("tenant_config").select("subdomain, name"),
      ]);
      const names: Record<string, string> = {};
      (tenantsRes.data ?? []).forEach((t) => { names[t.subdomain] = t.name; });
      setUsers(
        (profilesRes.data ?? []).map((p: any) => ({
          ...p,
          is_super_admin: !!p.is_super_admin,
          is_active: p.is_active !== false,
          tenant_name: p.tenant_id ? names[p.tenant_id] ?? null : null,
        })),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const update = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) throw error;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } as AdminUser : u)));
  };

  const toggleUserActive = async (id: string, active: boolean) => {
    const current = users.find((u) => u.id === id);
    // convite pendente continua pendente; os demais viram ativo ou suspenso
    const status = current?.status === "pending" ? "pending" : active ? "active" : "suspended";
    await update(id, { is_active: active, status });
  };

  const toggleSuperAdmin = async (id: string, value: boolean) => {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user?.id === id) throw new Error("Você não pode alterar o seu próprio acesso de super admin.");
    await update(id, { is_super_admin: value });
  };

  return { users, loading, toggleUserActive, toggleSuperAdmin, refetch: fetchAll };
}

export function useAdminTenants() {
  const [tenants, setTenants] = useState<TenantWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tenantsRes, profilesRes] = await Promise.all([
        supabase.from("tenant_config").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, tenant_id").eq("is_active", true),
      ]);

      if (!tenantsRes.data) return;

      // Only count users per tenant — no personal data accessed
      const userCountMap: Record<string, number> = {};
      (profilesRes.data ?? []).forEach((p) => {
        if (p.tenant_id) {
          userCountMap[p.tenant_id] = (userCountMap[p.tenant_id] ?? 0) + 1;
        }
      });

      const enriched: TenantWithStats[] = tenantsRes.data.map((t: any) => ({
        ...t,
        user_count: userCountMap[t.subdomain] ?? 0,
      }));

      setTenants(enriched);
    } finally {
      setLoading(false);
    }
  };

  const createTenant = async (input: CreateTenantInput) => {
    // Validate subdomain format (lowercase letters, numbers, hyphens)
    if (!/^[a-z0-9-]+$/.test(input.subdomain)) {
      throw new Error("O subdomínio deve conter apenas letras minúsculas, números e hífens.");
    }

    const { data, error } = await supabase
      .from("tenant_config")
      .insert({
        name: input.name,
        subdomain: input.subdomain,
        module: input.module,
        plan_tier: input.plan_tier || null,
        monthly_price: input.monthly_price || null,
        email: input.email || null,
        whatsapp_number: input.whatsapp_number || null,
        business_segment: input.business_segment || null,
        active: true,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchAll();
    return data;
  };

  const updateTenant = async (id: string, data: Partial<TenantWithStats>) => {
    const { error } = await supabase
      .from("tenant_config")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    setTenants((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
  };

  const toggleActive = async (id: string, active: boolean) => {
    await updateTenant(id, { active });
  };

  const deleteTenant = async (id: string) => {
    const { error } = await supabase.from("tenant_config").delete().eq("id", id);
    if (error) throw error;
    setTenants((prev) => prev.filter((t) => t.id !== id));
  };

  return { tenants, loading, createTenant, updateTenant, toggleActive, deleteTenant, refetch: fetchAll };
}
