import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TenantModule = "agency" | "clinic_dental" | "clinic_aesthetics";

// Cache por tenant_id — cada empresa tem seu próprio valor em memória
const moduleCache = new Map<string, TenantModule>();

export function useTenantModule() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id ?? null;

  const [module, setModule] = useState<TenantModule>(
    tenantId ? (moduleCache.get(tenantId) ?? "agency") : "agency"
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const cached = moduleCache.get(tenantId);
    if (cached) {
      setModule(cached);
      setLoading(false);
      return;
    }

    supabase
      .from("tenant_config")
      .select("module")
      .eq("subdomain", tenantId)
      .single()
      .then(({ data }) => {
        const mod = (data?.module as TenantModule) ?? "agency";
        moduleCache.set(tenantId, mod);
        setModule(mod);
        setLoading(false);
      });
  }, [tenantId]);

  const isClinic = module === "clinic_dental" || module === "clinic_aesthetics";
  const isDental = module === "clinic_dental";
  const isAesthetics = module === "clinic_aesthetics";

  return { module, loading, isClinic, isDental, isAesthetics };
}
