import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Key, Plus, Copy, MoreVertical, Eye, EyeOff, Trash2, Edit, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApiKeys, useToggleApiKey, useDeleteApiKey } from "@/hooks/useIntegrations";
import { NewApiKeyDialog } from "./NewApiKeyDialog";
import { toast } from "sonner";

export function ApiKeysTab() {
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const { data: apiKeys = [], isLoading } = useApiKeys();
  const toggleApiKey = useToggleApiKey();
  const deleteApiKey = useDeleteApiKey();

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para área de transferência!");
  };

  const maskApiKey = (key: string) => {
    return key.substring(0, 8) + "..." + key.substring(key.length - 4);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Crie chaves de API para integrar com sistemas externos
          </p>
        </div>
        <Button onClick={() => setNewDialogOpen(true)} className="gradient-bg">
          <Plus className="mr-2 h-4 w-4" />
          Nova API Key
        </Button>
      </div>

      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription>
          Use as API keys para integrar o CRM com n8n, Zapier ou sistemas customizados.
          <br />
          <span className="font-medium">Endpoint base:</span> https://api.respondeuai.com.br/v1
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Nenhuma API Key</h3>
            <p className="text-muted-foreground mb-4">
              Crie uma API Key para começar a integrar
            </p>
            <Button onClick={() => setNewDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <Card key={key.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{key.key_name}</h4>
                      {key.active ? (
                        <Badge className="bg-green-100 text-green-800">Ativa</Badge>
                      ) : (
                        <Badge variant="secondary">Inativa</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {visibleKeys.has(key.id) ? key.api_key : maskApiKey(key.api_key)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleKeyVisibility(key.id)}
                      >
                        {visibleKeys.has(key.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(key.api_key)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {key.scopes?.map((scope) => (
                        <Badge key={scope} variant="outline" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Criada {key.created_at && format(new Date(key.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      {key.last_used_at && (
                        <span>
                          Último uso: {formatDistanceToNow(new Date(key.last_used_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      )}
                      {key.expires_at && (
                        <span>
                          Expira: {format(new Date(key.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => toggleApiKey.mutate({ id: key.id, active: !key.active })}
                      >
                        {key.active ? (
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
                        onClick={() => deleteApiKey.mutate(key.id)}
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

      <NewApiKeyDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />
    </div>
  );
}
