import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateWebhook } from "@/hooks/useIntegrations";
import { AVAILABLE_EVENTS } from "@/types/integrations";
import { toast } from "sonner";

interface NewWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewWebhookDialog({ open, onOpenChange }: NewWebhookDialogProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [authType, setAuthType] = useState("none");
  const [authToken, setAuthToken] = useState("");

  const createWebhook = useCreateWebhook();

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!url.trim()) {
      toast.error("URL é obrigatória");
      return;
    }
    if (selectedEvents.length === 0) {
      toast.error("Selecione pelo menos um evento");
      return;
    }

    try {
      await createWebhook.mutateAsync({
        name,
        url,
        events: selectedEvents,
        auth_type: authType,
        auth_config: authType !== "none" ? { token: authToken } : undefined,
      });
      handleClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setName("");
    setUrl("");
    setSelectedEvents([]);
    setAuthType("none");
    setAuthToken("");
    onOpenChange(false);
  };

  const groupedEvents = AVAILABLE_EVENTS.reduce((acc, event) => {
    if (!acc[event.category]) {
      acc[event.category] = [];
    }
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_EVENTS>);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Webhook</DialogTitle>
          <DialogDescription>
            Configure um endpoint para receber notificações de eventos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Ex: Integração Zapier"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL do Endpoint *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Eventos *</Label>
            <div className="max-h-48 overflow-y-auto p-3 border rounded-lg space-y-4">
              {Object.entries(groupedEvents).map(([category, events]) => (
                <div key={category}>
                  <h5 className="font-medium text-sm mb-2">{category}</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {events.map((event) => (
                      <div key={event.value} className="flex items-center gap-2">
                        <Checkbox
                          id={event.value}
                          checked={selectedEvents.includes(event.value)}
                          onCheckedChange={() => toggleEvent(event.value)}
                        />
                        <Label
                          htmlFor={event.value}
                          className="text-xs font-normal cursor-pointer"
                        >
                          {event.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Autenticação</Label>
            <Select value={authType} onValueChange={setAuthType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="api_key">API Key (Header)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {authType !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="authToken">
                {authType === "bearer" ? "Bearer Token" : "API Key"}
              </Label>
              <Input
                id="authToken"
                type="password"
                placeholder="Digite o token..."
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" className="gradient-bg" disabled={createWebhook.isPending}>
              {createWebhook.isPending ? "Criando..." : "Criar Webhook"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
