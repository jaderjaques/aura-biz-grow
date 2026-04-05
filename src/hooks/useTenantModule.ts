import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TenantModule = "agency" | "clinic_dental" | "clinic_aesthetics";

let cachedModule: TenantModule | null = null;

export function useTenantModule() {
  const [module, setModule] = useState<TenantModule>(cachedModule ?? "agency");
  const [loading, setLoading] = useState(!cachedModule);

  useEffect(() => {
    if (cachedModule) return;

    supabase
      .from("tenant_config")
      .select("module")
      .single()
      .then(({ data }) => {
        const mod = (data?.module as TenantModule) ?? "agency";
        cachedModule = mod;
        setModule(mod);
        setLoading(false);
      });
  }, []);

  const isClinic = module === "clinic_dental" || module === "clinic_aesthetics";
  const isDental = module === "clinic_dental";
  const isAesthetics = module === "clinic_aesthetics";

  return { module, loading, isClinic, isDental, isAesthetics };
}
