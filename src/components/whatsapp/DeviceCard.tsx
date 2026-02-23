import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Smartphone,
  Edit,
  Trash2,
  MessageSquare,
  Calendar,
  MoreVertical,
  Send,
  Wifi,
  WifiOff,
  Link,
  Link2Off,
} from "lucide-react";
import { format } from "date-fns";
import { ConnectionStatus } from "./ConnectionStatus";
import { TestMessageModal } from "./TestMessageModal";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface DeviceCardProps {
  device: any;
  chatCount: number;
  onEdit: () => void;
}

export function DeviceCard({ device, chatCount, onEdit }: DeviceCardProps) {
  const [showTestModal, setShowTestModal] = useState(false);
  const queryClient = useQueryClient();
  const isConnected = device.status === "connected";

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("whatsapp_devices")
        .delete()
        .eq("id", device.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-devices"] });
      toast.success("Device removido");
    },
    onError: () => toast.error("Erro ao remover device"),
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("whatsapp_devices")
        .update({ status: isConnected ? "disconnected" : "connected" })
        .eq("id", device.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-devices"] });
      toast.success(`Device ${isConnected ? "desconectado" : "conectado"}`);
    },
    onError: () => toast.error("Erro ao alterar status"),
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">{device.device_name}</h3>
              <p className="text-sm text-muted-foreground">
                {device.phone_number || "Número não configurado"}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowTestModal(true)}>
                <Send className="h-4 w-4 mr-2" />
                Testar Envio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleMutation.mutate()}>
                {isConnected ? (
                  <>
                    <WifiOff className="h-4 w-4 mr-2" />
                    Desconectar
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4 mr-2" />
                    Conectar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (confirm("Tem certeza que deseja remover este device?")) {
                    deleteMutation.mutate();
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <ConnectionStatus status={device.status} size="sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <MessageSquare className="h-3 w-3" />
                Conversas Ativas
              </div>
              <p className="text-lg font-bold">{chatCount}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" />
                Última Sinc.
              </div>
              <p className="text-sm font-medium">
                {device.last_sync_at
                  ? format(new Date(device.last_sync_at), "dd/MM HH:mm")
                  : "Nunca"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>
              <span className="font-medium">API URL:</span>{" "}
              <span className="font-mono">{device.api_url}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Webhook:</span>
            {device.webhook_url ? (
              <span className="flex items-center gap-1 text-green-600">
                <Link className="h-3 w-3" />
                Configurado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Link2Off className="h-3 w-3" />
                Não configurado
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <TestMessageModal
        device={device}
        open={showTestModal}
        onOpenChange={setShowTestModal}
      />
    </>
  );
}
