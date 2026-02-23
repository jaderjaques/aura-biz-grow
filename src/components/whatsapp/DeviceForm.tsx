import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  device_name: z.string().min(1, "Nome obrigatório"),
  phone_number: z.string().optional(),
  api_url: z.string().url("URL inválida"),
  api_token: z.string().min(1, "Token obrigatório"),
});

type FormValues = z.infer<typeof formSchema>;

interface DeviceFormProps {
  device?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeviceForm({ device, open, onOpenChange }: DeviceFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!device;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      device_name: device?.device_name || "",
      phone_number: device?.phone_number || "",
      api_url: device?.api_url || "https://api.avisaapi.com.br",
      api_token: device?.api_token || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit) {
        const { error } = await supabase
          .from("whatsapp_devices")
          .update({
            device_name: values.device_name,
            phone_number: values.phone_number || null,
            api_url: values.api_url,
            api_token: values.api_token,
            status: "connected",
          })
          .eq("id", device.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_devices")
          .insert({
            device_name: values.device_name,
            phone_number: values.phone_number || null,
            api_url: values.api_url,
            api_token: values.api_token,
            status: "connected",
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-devices"] });
      toast.success(isEdit ? "Device atualizado!" : "Device conectado!");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao salvar device");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {isEdit ? "Editar Device" : "Conectar Novo Device"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Device *</Label>
            <Input {...register("device_name")} placeholder="Ex: Vendas, Suporte" />
            {errors.device_name && (
              <p className="text-xs text-destructive">{errors.device_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Número do WhatsApp</Label>
            <Input {...register("phone_number")} placeholder="+55 14 99808-5770" />
            <p className="text-xs text-muted-foreground">
              Opcional — será preenchido automaticamente após conexão
            </p>
          </div>

          <div className="space-y-2">
            <Label>URL da API *</Label>
            <Input {...register("api_url")} placeholder="https://api.avisaapi.com.br" />
            {errors.api_url && (
              <p className="text-xs text-destructive">{errors.api_url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>API Token *</Label>
            <Input {...register("api_token")} type="password" placeholder="Cole seu token aqui" />
            {errors.api_token && (
              <p className="text-xs text-destructive">{errors.api_token.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              💡 Obtenha seu token no painel da AvisaAPI
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Salvando..." : isEdit ? "Atualizar" : "Conectar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
