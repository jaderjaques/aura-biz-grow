import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Smartphone,
  Wifi,
  WifiOff,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DeviceCard } from "@/components/whatsapp/DeviceCard";
import { DeviceForm } from "@/components/whatsapp/DeviceForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function WhatsAppConfigPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);

  const { data: devices, isLoading } = useQuery({
    queryKey: ["whatsapp-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_devices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: chatCounts } = useQuery({
    queryKey: ["chat-counts-by-device"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("device_id")
        .eq("status", "open");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((c) => {
        if (c.device_id) counts[c.device_id] = (counts[c.device_id] || 0) + 1;
      });
      return counts;
    },
  });

  const connectedCount = devices?.filter((d) => d.status === "connected").length || 0;
  const totalChats = Object.values(chatCounts || {}).reduce((a, b) => a + b, 0);

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">WhatsApp</h1>
            <p className="text-muted-foreground">
              Gerencie os devices conectados via AvisaAPI
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedDevice(null);
              setShowForm(true);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Conectar Novo Device
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Wifi className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Devices Conectados</p>
                <p className="text-2xl font-bold">{connectedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversas Ativas</p>
                <p className="text-2xl font-bold">{totalChats}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Devices</p>
                <p className="text-2xl font-bold">{devices?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Devices List */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Devices Configurados</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Carregando devices...
            </div>
          ) : devices?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-1">Nenhum device conectado</h3>
                <p className="text-muted-foreground mb-4">
                  Conecte seu primeiro device WhatsApp para começar
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4" />
                  Conectar Device
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {devices!.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  chatCount={chatCounts?.[device.id] || 0}
                  onEdit={() => {
                    setSelectedDevice(device);
                    setShowForm(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Help */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Como conectar um device
            </h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Clique em "Conectar Novo Device"</li>
              <li>Preencha o nome do device (ex: "Vendas", "Suporte")</li>
              <li>Insira a URL da API da AvisaAPI</li>
              <li>Cole seu API Token</li>
              <li>Salve e aguarde a conexão</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              💡 Dica: Você pode obter seu API Token no painel da AvisaAPI
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Device Form Dialog */}
      <DeviceForm
        device={selectedDevice}
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setSelectedDevice(null);
        }}
      />
    </AppLayout>
  );
}
