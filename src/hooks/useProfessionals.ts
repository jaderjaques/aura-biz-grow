import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Professional, ProfessionalWithProfile } from "@/types/professionals";
import { toast } from "sonner";

export function useProfessionals() {
  const [professionals, setProfessionals] = useState<ProfessionalWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch();
  }, []);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("professionals")
        .select(`
          *,
          profile:profiles(id, full_name, email, avatar_url)
        `)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setProfessionals((data as ProfessionalWithProfile[]) ?? []);
    } finally {
      setLoading(false);
    }
  };

  // Profiles not yet linked to a professional (for the "new professional" dialog)
  const fetchUnlinkedProfiles = async () => {
    const linkedIds = professionals
      .filter((p) => p.profile_id)
      .map((p) => p.profile_id as string);

    const query = supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .eq("is_active", true)
      .order("full_name");

    const { data } = await query;
    if (!data) return [];

    return data.filter((p) => !linkedIds.includes(p.id));
  };

  const createProfessional = async (data: Partial<Professional>) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .single();

    if (!profile) throw new Error("Profile not found");

    const { data: created, error } = await supabase
      .from("professionals")
      .insert({ ...data, tenant_id: profile.tenant_id, active: true })
      .select(`*, profile:profiles(id, full_name, email, avatar_url)`)
      .single();

    if (error) {
      toast.error("Erro ao cadastrar profissional");
      throw error;
    }

    toast.success("Profissional cadastrado!");
    setProfessionals((prev) => [...prev, created as ProfessionalWithProfile]);
    return created;
  };

  const updateProfessional = async (id: string, data: Partial<Professional>) => {
    const { data: updated, error } = await supabase
      .from("professionals")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(`*, profile:profiles(id, full_name, email, avatar_url)`)
      .single();

    if (error) {
      toast.error("Erro ao atualizar profissional");
      throw error;
    }

    toast.success("Profissional atualizado!");
    setProfessionals((prev) =>
      prev.map((p) => (p.id === id ? (updated as ProfessionalWithProfile) : p))
    );
  };

  const toggleActive = async (id: string, active: boolean) => {
    await updateProfessional(id, { active });
  };

  const getActiveProfessionals = () =>
    professionals.filter((p) => p.active);

  return {
    professionals,
    loading,
    createProfessional,
    updateProfessional,
    toggleActive,
    fetchUnlinkedProfiles,
    getActiveProfessionals,
    refetch: fetch,
  };
}
