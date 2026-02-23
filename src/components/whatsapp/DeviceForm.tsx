import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Smartphone, Copy, Check } from "lucide-react";
import { useState } from "react";
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
  const [copied, setCopied] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;

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

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        device_name: values.device_name,
        phone_number: values.phone_number || null,
        api_url: values.api_url,
        api_token: values.api_token,
        webhook_url: webhookUrl,
        status: "connected" as const,
      };
      if (isEdit) {
        const { error } = await supabase
          .from("whatsapp_devices")
          .update(payload)
          .eq("id", device.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_devices")
          .insert(payload);
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Webhook URL - Read Only */}
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookUrl}
                className="font-mono text-xs bg-muted"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Cole esta URL nas configurações de webhook da AvisaAPI
            </p>
          </div>

          {/* Instruções */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
            <p className="text-xs font-medium">📋 Como configurar o webhook:</p>
            <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-0.5">
              <li>Copie a URL do webhook acima</li>
              <li>Acesse o painel da AvisaAPI</li>
              <li>Vá em Configurações → Webhooks</li>
              <li>Cole a URL e ative "Mensagem Recebida"</li>
              <li>Salve as configurações</li>
            </ol>
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
