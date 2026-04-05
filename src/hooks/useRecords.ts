import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  MedicalRecord,
  AnamnesisTemplate,
  OdontogramRecord,
  TeethStatus,
} from "@/types/records";
import { toast } from "sonner";

export function useRecords(patientId: string | null) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [templates, setTemplates] = useState<AnamnesisTemplate[]>([]);
  const [odontogram, setOdontogram] = useState<OdontogramRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    fetchAll();
  }, [patientId]);

  const fetchAll = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [recordsRes, templatesRes, odontogramRes] = await Promise.all([
        supabase
          .from("medical_records")
          .select("*")
          .eq("patient_id", patientId)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("anamnesis_templates")
          .select("*")
          .eq("active", true)
          .order("is_default", { ascending: false }),
        supabase
          .from("odontogram")
          .select("*")
          .eq("patient_id", patientId)
          .order("version", { ascending: false })
          .limit(1),
      ]);

      if (recordsRes.data) setRecords(recordsRes.data as MedicalRecord[]);
      if (templatesRes.data) setTemplates(templatesRes.data as AnamnesisTemplate[]);
      if (odontogramRes.data && odontogramRes.data.length > 0) {
        setOdontogram(odontogramRes.data[0] as OdontogramRecord);
      }
    } finally {
      setLoading(false);
    }
  };

  const createRecord = async (data: Partial<MedicalRecord>) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, id")
      .single();

    if (!profile) throw new Error("Profile not found");

    const payload = {
      ...data,
      patient_id: patientId,
      tenant_id: profile.tenant_id,
      professional_id: profile.id,
      is_active: true,
      version: 1,
    };

    const { data: created, error } = await supabase
      .from("medical_records")
      .insert(payload)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao salvar registro");
      throw error;
    }

    toast.success("Registro salvo com sucesso!");
    setRecords((prev) => [created as MedicalRecord, ...prev]);
    return created;
  };

  const saveOdontogram = async (teethStatus: TeethStatus, notes?: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, id")
      .single();

    if (!profile) throw new Error("Profile not found");

    const newVersion = (odontogram?.version ?? 0) + 1;

    const { data: saved, error } = await supabase
      .from("odontogram")
      .insert({
        patient_id: patientId,
        teeth_status: teethStatus as any,
        notes: notes || null,
        professional_id: profile.id,
        version: newVersion,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao salvar odontograma");
      throw error;
    }

    toast.success("Odontograma salvo!");
    setOdontogram(saved as OdontogramRecord);
    return saved;
  };

  return {
    records,
    templates,
    odontogram,
    loading,
    createRecord,
    saveOdontogram,
    refetch: fetchAll,
  };
}
