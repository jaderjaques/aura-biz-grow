import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PatientExamImage {
  id: string;
  patient_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  description: string | null;
  exam_date: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export function usePatientExams(patientId: string | null) {
  const [images, setImages] = useState<PatientExamImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    fetchImages();
  }, [patientId]);

  const fetchImages = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("patient_exam_images")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setImages((data as PatientExamImage[]) ?? []);
    } catch {
      toast.error("Erro ao carregar imagens de exames");
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (
    file: File,
    meta: { description?: string; exam_date?: string }
  ) => {
    if (!patientId) return null;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user!.id)
        .single();
      if (!profile) throw new Error("Profile not found");

      // Upload para o storage
      const ext = file.name.split(".").pop();
      const path = `${patientId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("patient-exams")
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      // URL assinada válida por 1 ano (depois buscamos nova URL ao exibir)
      const { data: urlData } = await supabase.storage
        .from("patient-exams")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      const { data: record, error: insertError } = await supabase
        .from("patient_exam_images")
        .insert({
          patient_id: patientId,
          tenant_id: profile.tenant_id,
          file_url: urlData?.signedUrl ?? path,
          file_name: file.name,
          file_size: file.size,
          description: meta.description || null,
          exam_date: meta.exam_date || null,
          uploaded_by: user?.id,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      toast.success("Imagem enviada com sucesso!");
      setImages((prev) => [record as PatientExamImage, ...prev]);
      return record;
    } catch (err: any) {
      toast.error("Erro ao enviar imagem: " + (err.message ?? ""));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (image: PatientExamImage) => {
    try {
      // Extrai o path do storage da URL
      const urlObj = new URL(image.file_url);
      const storagePath = urlObj.pathname.split("/patient-exams/")[1];
      if (storagePath) {
        await supabase.storage.from("patient-exams").remove([storagePath]);
      }

      const { error } = await supabase
        .from("patient_exam_images")
        .delete()
        .eq("id", image.id);
      if (error) throw error;

      toast.success("Imagem removida!");
      setImages((prev) => prev.filter((i) => i.id !== image.id));
    } catch {
      toast.error("Erro ao remover imagem");
    }
  };

  const getSignedUrl = async (image: PatientExamImage): Promise<string> => {
    try {
      const urlObj = new URL(image.file_url);
      const storagePath = urlObj.pathname.split("/patient-exams/")[1];
      if (!storagePath) return image.file_url;
      const { data } = await supabase.storage
        .from("patient-exams")
        .createSignedUrl(storagePath, 60 * 60); // 1h
      return data?.signedUrl ?? image.file_url;
    } catch {
      return image.file_url;
    }
  };

  return {
    images,
    loading,
    uploading,
    uploadImage,
    deleteImage,
    getSignedUrl,
    refetch: fetchImages,
  };
}
