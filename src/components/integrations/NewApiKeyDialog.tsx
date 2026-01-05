import { useState } from "react";
import { Copy, AlertTriangle } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreateApiKey } from "@/hooks/useIntegrations";
import { AVAILABLE_SCOPES } from "@/types/integrations";
import { toast } from "sonner";

interface NewApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewApiKeyDialog({ open, onOpenChange }: NewApiKeyDialogProps) {
  const [keyName, setKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["leads:read", "leads:write"]);
  const [expiresAt, setExpiresAt] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const createApiKey = useCreateApiKey();

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      toast.error("Nome da key é obrigatório");
      return;
    }
    if (selectedScopes.length === 0) {
      toast.error("Selecione pelo menos uma permissão");
      return;
    }

    try {
      const result = await createApiKey.mutateAsync({
        key_name: keyName,
        scopes: selectedScopes,
        expires_at: expiresAt || undefined,
      });
      setCreatedKey(result.api_key);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const copyToClipboard = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      toast.success("API Key copiada!");
    }
  };

  const handleClose = () => {
    setKeyName("");
    setSelectedScopes(["leads:read", "leads:write"]);
    setExpiresAt("");
    setCreatedKey(null);
    onOpenChange(false);
  };

  if (createdKey) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600">API Key criada com sucesso!</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="flex-1 text-sm font-mono break-all">{createdKey}</code>
              <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Copie e guarde em local seguro. Esta chave não será mostrada novamente.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova API Key</DialogTitle>
          <DialogDescription>
            Crie uma chave para acessar a API do CRM
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keyName">Nome da Key *</Label>
            <Input
              id="keyName"
              placeholder="Ex: Integração n8n"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Permissões (Scopes)</Label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
              {AVAILABLE_SCOPES.map((scope) => (
                <div key={scope.value} className="flex items-center gap-2">
                  <Checkbox
                    id={scope.value}
                    checked={selectedScopes.includes(scope.value)}
                    onCheckedChange={() => toggleScope(scope.value)}
                  />
                  <Label htmlFor={scope.value} className="text-sm font-normal cursor-pointer">
                    {scope.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Data de Expiração (opcional)</Label>
            <Input
              id="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Guarde a API key em local seguro. Ela será mostrada apenas uma vez.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" className="gradient-bg" disabled={createApiKey.isPending}>
              {createApiKey.isPending ? "Gerando..." : "Gerar API Key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
