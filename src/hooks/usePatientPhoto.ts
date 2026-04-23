import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePatientPhoto() {
  const [uploading, setUploading] = useState(false);

  const uploadPhoto = async (
    patientId: string,
    file: File,
    onSuccess: (url: string) => void
  ) => {
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${patientId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("patient-avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from("patient-avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      if (!urlData?.signedUrl) throw new Error("Falha ao gerar URL");

      const { error: updateError } = await supabase
        .from("patients")
        .update({ photo_url: urlData.signedUrl })
        .eq("id", patientId);

      if (updateError) throw updateError;

      onSuccess(urlData.signedUrl);
      toast.success("Foto atualizada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar foto: " + (err.message ?? ""));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (patientId: string, onSuccess: () => void) => {
    setUploading(true);
    try {
      const { error } = await supabase
        .from("patients")
        .update({ photo_url: null })
        .eq("id", patientId);
      if (error) throw error;
      onSuccess();
      toast.success("Foto removida.");
    } catch (err: any) {
      toast.error("Erro ao remover foto: " + (err.message ?? ""));
    } finally {
      setUploading(false);
    }
  };

  return { uploading, uploadPhoto, removePhoto };
}
