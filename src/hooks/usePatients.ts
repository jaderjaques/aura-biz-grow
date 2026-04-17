import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Patient, PatientWithDetails, Insurance } from "@/types/patients";

const PATIENTS_KEY  = ["patients"];
const INSURANCES_KEY = ["insurances"];

// ── query helpers ─────────────────────────────────────────────────────────────

async function fetchPatientsQuery(
  filters?: { search?: string; status?: string; insurance_id?: string }
): Promise<PatientWithDetails[]> {
  let query = supabase
    .from("patients")
    .select(`
      *,
      insurance:insurances(id, name),
      preferred_professional:profiles!patients_preferred_professional_id_fkey(id, full_name, avatar_url)
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters?.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,cpf.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.insurance_id && filters.insurance_id !== "all") {
    query = query.eq("insurance_id", filters.insurance_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as PatientWithDetails[]) ?? [];
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function usePatients(
  filters?: { search?: string; status?: string; insurance_id?: string }
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Fase 1: lista leve — aparece rápido ────────────────────────────────
  const { data: quickPatients = [], isLoading: loadingQuick } = useQuery({
    queryKey: [...PATIENTS_KEY, "quick"],
    queryFn: async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, full_name, phone, status, has_insurance, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as Partial<PatientWithDetails>[];
    },
  });

  // ── Fase 2: dados completos — carrega em background ────────────────────
  const { data: fullPatients, isFetching: fetchingFull } = useQuery({
    queryKey: [...PATIENTS_KEY, "full", filters],
    queryFn: () => fetchPatientsQuery(filters),
    enabled: !loadingQuick, // só começa depois que a fase 1 termina
  });

  // Usa dados completos quando prontos; enquanto isso, exibe lista leve
  const patients = (fullPatients ?? quickPatients) as PatientWithDetails[];
  const loading  = loadingQuick;

  // ── Convênios ──────────────────────────────────────────────────────────
  const { data: insurances = [] } = useQuery<Insurance[]>({
    queryKey: INSURANCES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurances")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data as Insurance[]) ?? [];
    },
    staleTime: 5 * 60_000, // convênios mudam pouco, cache de 5 min está ok
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: PATIENTS_KEY });

  const fetchPatients = (_filters?: typeof filters) =>
    queryClient.invalidateQueries({ queryKey: PATIENTS_KEY });

  const fetchInsurances = () =>
    queryClient.invalidateQueries({ queryKey: INSURANCES_KEY });

  // ── Criar ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (patientData: Partial<Patient>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user!.id)
        .single();

      const { data, error } = await supabase
        .from("patients")
        .insert({ ...patientData, tenant_id: profile?.tenant_id, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Paciente cadastrado!", description: `${data.full_name} foi adicionado.` });
      invalidate();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao cadastrar paciente", description: error.message, variant: "destructive" });
    },
  });

  const createPatient = (data: Partial<Patient>) =>
    createMutation.mutateAsync(data);

  // ── Atualizar ────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Patient> }) => {
      const { error } = await supabase.from("patients").update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Paciente atualizado!" });
      invalidate();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar paciente", description: error.message, variant: "destructive" });
    },
  });

  const updatePatient = (id: string, data: Partial<Patient>) =>
    updateMutation.mutateAsync({ id, data });

  // ── Deletar (soft delete) ────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("patients")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Paciente removido!" });
      invalidate();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao remover paciente", description: error.message, variant: "destructive" });
    },
  });

  const deletePatient = (id: string) => deleteMutation.mutateAsync(id);

  const getActivePatients       = () => patients.filter((p) => p.status === "active");
  const getPatientsWithInsurance = () => patients.filter((p) => p.has_insurance);
  const getPatientsPrivate       = () => patients.filter((p) => !p.has_insurance);

  return {
    patients,
    insurances,
    loading,
    fetchingFull,
    fetchPatients,
    fetchInsurances,
    createPatient,
    updatePatient,
    deletePatient,
    getActivePatients,
    getPatientsWithInsurance,
    getPatientsPrivate,
  };
}
