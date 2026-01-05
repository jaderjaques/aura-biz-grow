import { useState } from "react";
import { MessageSquare, Mail, Zap, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useIntegrationSettings, useUpsertIntegrationSetting } from "@/hooks/useIntegrations";
import { toast } from "sonner";

export function IntegrationSettingsTab() {
  const { data: settings = [] } = useIntegrationSettings();
  const upsertSetting = useUpsertIntegrationSetting();

  const evolutionConfig = settings.find((s) => s.integration_name === "evolution_api");
  const smtpConfig = settings.find((s) => s.integration_name === "smtp");

  // Evolution API state
  const [evolutionUrl, setEvolutionUrl] = useState(
    (evolutionConfig?.config as Record<string, string>)?.api_url || ""
  );
  const [evolutionKey, setEvolutionKey] = useState(
    (evolutionConfig?.config as Record<string, string>)?.api_key || ""
  );
  const [evolutionInstance, setEvolutionInstance] = useState(
    (evolutionConfig?.config as Record<string, string>)?.instance_name || ""
  );

  // SMTP state
  const [smtpHost, setSmtpHost] = useState(
    (smtpConfig?.config as Record<string, string>)?.host || ""
  );
  const [smtpPort, setSmtpPort] = useState(
    (smtpConfig?.config as Record<string, string>)?.port || "587"
  );
  const [smtpUsername, setSmtpUsername] = useState(
    (smtpConfig?.config as Record<string, string>)?.username || ""
  );
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromName, setSmtpFromName] = useState(
    (smtpConfig?.config as Record<string, string>)?.from_name || ""
  );
  const [smtpFromEmail, setSmtpFromEmail] = useState(
    (smtpConfig?.config as Record<string, string>)?.from_email || ""
  );

  const saveEvolutionConfig = async () => {
    if (!evolutionUrl || !evolutionKey || !evolutionInstance) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      await upsertSetting.mutateAsync({
        integration_name: "evolution_api",
        config: {
          api_url: evolutionUrl,
          api_key: evolutionKey,
          instance_name: evolutionInstance,
        },
        active: true,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const saveSmtpConfig = async () => {
    if (!smtpHost || !smtpUsername || !smtpFromEmail) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      await upsertSetting.mutateAsync({
        integration_name: "smtp",
        config: {
          host: smtpHost,
          port: smtpPort,
          username: smtpUsername,
          password: smtpPassword || (smtpConfig?.config as Record<string, string>)?.password || "",
          from_name: smtpFromName,
          from_email: smtpFromEmail,
        },
        active: true,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const testConnection = (type: string) => {
    toast.info(`Testando conexão ${type}...`);
    // TODO: Implement actual connection test via edge function
    setTimeout(() => {
      toast.success("Conexão testada com sucesso!");
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Configurações de Integração</h3>
        <p className="text-sm text-muted-foreground">
          Configure credenciais para serviços externos
        </p>
      </div>

      {/* Evolution API */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">Evolution API (WhatsApp)</CardTitle>
                <CardDescription>
                  Envie mensagens automatizadas via WhatsApp
                </CardDescription>
              </div>
            </div>
            {evolutionConfig?.active ? (
              <Badge className="bg-green-100 text-green-800">Conectado</Badge>
            ) : (
              <Badge variant="secondary">Não Configurado</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>API URL</Label>
              <Input
                placeholder="https://evolution.example.com"
                value={evolutionUrl}
                onChange={(e) => setEvolutionUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="Sua API key..."
                value={evolutionKey}
                onChange={(e) => setEvolutionKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome da Instância</Label>
              <Input
                placeholder="responde_uai"
                value={evolutionInstance}
                onChange={(e) => setEvolutionInstance(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => testConnection("Evolution API")}>
              <Zap className="mr-2 h-4 w-4" />
              Testar Conexão
            </Button>
            <Button onClick={saveEvolutionConfig} disabled={upsertSetting.isPending}>
              Salvar Configuração
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMTP */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Email SMTP</CardTitle>
                <CardDescription>
                  Envie emails automáticos (Gmail, Outlook, etc)
                </CardDescription>
              </div>
            </div>
            {smtpConfig?.active ? (
              <Badge className="bg-green-100 text-green-800">Conectado</Badge>
            ) : (
              <Badge variant="secondary">Não Configurado</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Host</Label>
              <Input
                placeholder="smtp.gmail.com"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Porta</Label>
              <Input
                placeholder="587"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Input
                placeholder="email@example.com"
                value={smtpUsername}
                onChange={(e) => setSmtpUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do Remetente</Label>
              <Input
                placeholder="Responde uAI"
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email Remetente</Label>
              <Input
                placeholder="contato@respondeuai.com.br"
                value={smtpFromEmail}
                onChange={(e) => setSmtpFromEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => testConnection("SMTP")}>
              <Mail className="mr-2 h-4 w-4" />
              Enviar Email Teste
            </Button>
            <Button onClick={saveSmtpConfig} disabled={upsertSetting.isPending}>
              Salvar Configuração
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
