import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Globe, FileText, Zap, Settings, ScrollText } from "lucide-react";
import { ApiKeysTab } from "@/components/integrations/ApiKeysTab";
import { WebhooksTab } from "@/components/integrations/WebhooksTab";
import { TemplatesTab } from "@/components/integrations/TemplatesTab";
import { IntegrationSettingsTab } from "@/components/integrations/IntegrationSettingsTab";
import { LogsTab } from "@/components/integrations/LogsTab";

export default function Integrations() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrações & Automação</h1>
          <p className="text-muted-foreground">
            Configure webhooks, API keys e automações
          </p>
        </div>

        <Tabs defaultValue="api-keys" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
            <TabsTrigger
              value="api-keys"
              className="data-[state=active]:gradient-bg data-[state=active]:text-white"
            >
              <Key className="mr-2 h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger
              value="webhooks"
              className="data-[state=active]:gradient-bg data-[state=active]:text-white"
            >
              <Globe className="mr-2 h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="data-[state=active]:gradient-bg data-[state=active]:text-white"
            >
              <FileText className="mr-2 h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:gradient-bg data-[state=active]:text-white"
            >
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="data-[state=active]:gradient-bg data-[state=active]:text-white"
            >
              <ScrollText className="mr-2 h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys">
            <ApiKeysTab />
          </TabsContent>

          <TabsContent value="webhooks">
            <WebhooksTab />
          </TabsContent>

          <TabsContent value="templates">
            <TemplatesTab />
          </TabsContent>

          <TabsContent value="settings">
            <IntegrationSettingsTab />
          </TabsContent>

          <TabsContent value="logs">
            <LogsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
