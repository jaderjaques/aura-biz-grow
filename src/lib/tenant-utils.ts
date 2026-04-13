import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the current user's tenant_id and id from the profiles table.
 * Use this before any INSERT that requires tenant_id for RLS.
 */
export async function getCurrentProfile(): Promise<{ id: string; tenant_id: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, tenant_id")
    .eq("id", user.id)
    .single();

  if (error || !data?.tenant_id) throw new Error("Perfil não encontrado ou sem tenant.");
  return { id: data.id, tenant_id: data.tenant_id };
}
