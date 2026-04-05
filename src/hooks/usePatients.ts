import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Patient, PatientWithDetails, Insurance } from "@/types/patients";

export function usePatients() {
  const [patients, setPatients] = useState<PatientWithDetails[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPatients = async (filters?: { search?: string; status?: string; insurance_id?: string }) => {
    setLoading(true);
    try {
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
      setPatients((data as PatientWithDetails[]) || []);
    } catch (error: any) {
      console.error("Error fetching patients:", error);
      toast({
        title: "Erro ao carregar pacientes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInsurances = async () => {
    try {
      const { data, error } = await supabase
        .from("insurances")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      setInsurances((data as Insurance[]) || []);
    } catch (error: any) {
      console.error("Error fetching insurances:", error);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchInsurances();
  }, []);

  const createPatient = async (patientData: Partial<Patient>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user!.id)
        .single();

      const { data, error } = await supabase
        .from("patients")
        .insert({
          ...patientData,
          tenant_id: profile?.tenant_id,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Paciente cadastrado!",
        description: `${data.full_name} foi adicionado.`,
      });

      await fetchPatients();
      return data;
    } catch (error: any) {
      console.error("Error creating patient:", error);
      toast({
        title: "Erro ao cadastrar paciente",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePatient = async (id: string, patientData: Partial<Patient>) => {
    try {
      const { error } = await supabase
        .from("patients")
        .update(patientData as any)
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Paciente atualizado!" });
      await fetchPatients();
    } catch (error: any) {
      console.error("Error updating patient:", error);
      toast({
        title: "Erro ao atualizar paciente",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePatient = async (id: string) => {
    try {
      const { error } = await supabase
        .from("patients")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Paciente removido!" });
      await fetchPatients();
    } catch (error: any) {
      console.error("Error deleting patient:", error);
      toast({
        title: "Erro ao remover paciente",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getActivePatients = () => patients.filter((p) => p.status === "active");
  const getPatientsWithInsurance = () => patients.filter((p) => p.has_insurance);
  const getPatientsPrivate = () => patients.filter((p) => !p.has_insurance);

  return {
    patients,
    insurances,
    loading,
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
