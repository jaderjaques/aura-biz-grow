import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Professional, ProfessionalWithProfile } from "@/types/professionals";
import { toast } from "sonner";

const QUERY_KEY = ["professionals"];

async function fetchAllProfessionals(): Promise<ProfessionalWithProfile[]> {
  const { data, error } = await supabase
    .from("professionals")
    .select(`*, profile:profiles(id, full_name, email, avatar_url)`)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as ProfessionalWithProfile[]) ?? [];
}

export function useProfessionals() {
  const queryClient = useQueryClient();

  const { data: professionals = [], isLoading: loading } = useQuery<ProfessionalWithProfile[]>({
    queryKey: QUERY_KEY,
    queryFn: fetchAllProfessionals,
    staleTime: 5 * 60_000, // 5 minutos — navegar entre páginas não re-busca
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  // ── Profiles ainda não vinculados a um profissional ─────────────────────
  const fetchUnlinkedProfiles = async () => {
    const linkedIds = professionals
      .filter((p) => p.profile_id)
      .map((p) => p.profile_id as string);

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .eq("is_active", true)
      .order("full_name");

    if (!data) return [];
    return data.filter((p) => !linkedIds.includes(p.id));
  };

  // ── Criar ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Professional>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user!.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { data: created, error } = await supabase
        .from("professionals")
        .insert({ ...data, tenant_id: profile.tenant_id, active: true })
        .select(`*, profile:profiles(id, full_name, email, avatar_url)`)
        .single();

      if (error) throw error;
      return created as ProfessionalWithProfile;
    },
    onSuccess: () => {
      toast.success("Profissional cadastrado!");
      invalidate();
    },
    onError: () => toast.error("Erro ao cadastrar profissional"),
  });

  const createProfessional = (data: Partial<Professional>) =>
    createMutation.mutateAsync(data);

  // ── Atualizar ────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Professional> }) => {
      const { data: updated, error } = await supabase
        .from("professionals")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(`*, profile:profiles(id, full_name, email, avatar_url)`)
        .single();
      if (error) throw error;
      return updated as ProfessionalWithProfile;
    },
    onSuccess: () => {
      toast.success("Profissional atualizado!");
      invalidate();
    },
    onError: () => toast.error("Erro ao atualizar profissional"),
  });

  const updateProfessional = (id: string, data: Partial<Professional>) =>
    updateMutation.mutateAsync({ id, data });

  const toggleActive = (id: string, active: boolean) =>
    updateProfessional(id, { active });

  const getActiveProfessionals = () => professionals.filter((p) => p.active);

  return {
    professionals,
    loading,
    createProfessional,
    updateProfessional,
    toggleActive,
    fetchUnlinkedProfiles,
    getActiveProfessionals,
    refetch: invalidate,
  };
}
