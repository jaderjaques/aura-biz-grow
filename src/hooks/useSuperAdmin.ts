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

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  tenant_id: string;
  role: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  created_at: string;
  last_login_at: string | null;
  tenant_name?: string;
}

export function useSuperAdmin() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("is_super_admin")
      .single()
      .then(({ data }) => {
        setIsSuperAdmin(data?.is_super_admin ?? false);
        setLoading(false);
      });
  }, []);

  return { isSuperAdmin, loading };
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

  return { tenants, loading, updateTenant, toggleActive, refetch: fetchAll };
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tenants, setTenants] = useState<TenantWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, tenantsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, tenant_id, role, is_active, is_super_admin, created_at, last_login_at")
          .order("created_at", { ascending: false }),
        supabase.from("tenant_config").select("subdomain, name"),
      ]);

      const tenantNameMap: Record<string, string> = {};
      (tenantsRes.data ?? []).forEach((t: any) => {
        tenantNameMap[t.subdomain] = t.name;
      });

      const enriched: AdminUser[] = (usersRes.data ?? []).map((u: any) => ({
        ...u,
        tenant_name: tenantNameMap[u.tenant_id] ?? u.tenant_id,
      }));

      setUsers(enriched);
      setTenants(tenantsRes.data as any ?? []);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserActive = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_active }).eq("id", id);
    if (error) throw error;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_active } : u)));
  };

  const toggleSuperAdmin = async (id: string, is_super_admin: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_super_admin }).eq("id", id);
    if (error) throw error;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_super_admin } : u)));
  };

  return { users, tenants, loading, toggleUserActive, toggleSuperAdmin, refetch: fetchAll };
}
