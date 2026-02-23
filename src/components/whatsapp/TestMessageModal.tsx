import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TestMessageModalProps {
  device: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestMessageModal({ device, open, onOpenChange }: TestMessageModalProps) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    "Olá! Esta é uma mensagem de teste do CRM 🚀"
  );

  const sendMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${device.api_url}/message/sendText/${device.api_token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: phone.replace(/\D/g, ""),
            text: message,
          }),
        }
      );

      if (!response.ok) throw new Error("Erro ao enviar mensagem");
      return await response.json();
    },
    onSuccess: () => {
      toast.success("Mensagem enviada com sucesso! ✅");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao enviar mensagem de teste");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Testar Envio - {device.device_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Número de Telefone (com DDI)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5514998085770"
            />
            <p className="text-xs text-muted-foreground">
              Ex: 5514998085770 (55 = Brasil, 14 = DDD)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Digite sua mensagem de teste..."
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => sendMutation.mutate()}
              disabled={!phone || !message || sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar Teste
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
