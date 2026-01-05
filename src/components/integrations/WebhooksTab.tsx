import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Globe, Plus, MoreVertical, Trash2, Eye, Check, X, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWebhooks, useToggleWebhook, useDeleteWebhook } from "@/hooks/useIntegrations";
import { AVAILABLE_EVENTS } from "@/types/integrations";
import { NewWebhookDialog } from "./NewWebhookDialog";

export function WebhooksTab() {
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const { data: webhooks = [], isLoading } = useWebhooks();
  const toggleWebhook = useToggleWebhook();
  const deleteWebhook = useDeleteWebhook();

  const groupedEvents = AVAILABLE_EVENTS.reduce((acc, event) => {
    if (!acc[event.category]) {
      acc[event.category] = [];
    }
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_EVENTS>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Webhooks</h3>
          <p className="text-sm text-muted-foreground">
            Receba notificações em tempo real sobre eventos do CRM
          </p>
        </div>
        <Button onClick={() => setNewDialogOpen(true)} className="gradient-bg">
          <Plus className="mr-2 h-4 w-4" />
          Novo Webhook
        </Button>
      </div>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Eventos Disponíveis
              </CardTitle>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(groupedEvents).map(([category, events]) => (
                  <div key={category}>
                    <h4 className="font-medium text-sm mb-2">{category}:</h4>
                    <div className="space-y-1">
                      {events.map((event) => (
                        <Badge key={event.value} variant="outline" className="text-xs block w-fit">
                          {event.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Nenhum Webhook</h3>
            <p className="text-muted-foreground mb-4">
              Configure webhooks para receber notificações
            </p>
            <Button onClick={() => setNewDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{webhook.name}</h4>
                      {webhook.active ? (
                        <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <span className="font-mono">{webhook.url}</span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-semibold">{webhook.total_deliveries || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sucesso</p>
                        <p className="font-semibold text-green-600">{webhook.successful_deliveries || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Falhas</p>
                        <p className="font-semibold text-destructive">{webhook.failed_deliveries || 0}</p>
                      </div>
                    </div>

                    {webhook.last_delivery_at && (
                      <p className="text-xs text-muted-foreground">
                        Última entrega: {formatDistanceToNow(new Date(webhook.last_delivery_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Logs
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toggleWebhook.mutate({ id: webhook.id, active: !webhook.active })}
                      >
                        {webhook.active ? (
                          <>
                            <X className="mr-2 h-4 w-4" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => deleteWebhook.mutate(webhook.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Deletar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewWebhookDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />
    </div>
  );
}
