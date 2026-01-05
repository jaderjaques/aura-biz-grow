import { Link, useLocation, Navigate } from "react-router-dom";
import { Shield, Users, Key, Bell, Building, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";

const settingsTabs = [
  { id: "roles", label: "Cargos", icon: Shield, href: "/configuracoes/roles" },
  { id: "auditoria", label: "Auditoria", icon: FileText, href: "/configuracoes/auditoria" },
  { id: "integracoes", label: "Integrações", icon: Key, href: "/configuracoes/integracoes" },
  { id: "equipe", label: "Equipe", icon: Users, href: "/configuracoes/equipe", comingSoon: true },
  { id: "notificacoes", label: "Notificações", icon: Bell, href: "/configuracoes/notificacoes", comingSoon: true },
  { id: "empresa", label: "Empresa", icon: Building, href: "/configuracoes/empresa", comingSoon: true },
];

export default function Settings() {
  const location = useLocation();
  const currentTab = location.pathname.split("/").pop() || "roles";

  // Redirect to roles page if on /configuracoes
  if (location.pathname === "/configuracoes") {
    return <Navigate to="/configuracoes/roles" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema
          </p>
        </div>

        <Tabs value={currentTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
            {settingsTabs.map((tab) => (
              <Link key={tab.id} to={tab.comingSoon ? "#" : tab.href}>
                <TabsTrigger
                  value={tab.id}
                  disabled={tab.comingSoon}
                  className={cn(
                    "data-[state=active]:gradient-bg data-[state=active]:text-white",
                    tab.comingSoon && "opacity-60"
                  )}
                >
                  <tab.icon className="mr-2 h-4 w-4" />
                  {tab.label}
                  {tab.comingSoon && (
                    <Badge variant="outline" className="ml-2 text-[10px] px-1.5">
                      Em breve
                    </Badge>
                  )}
                </TabsTrigger>
              </Link>
            ))}
          </TabsList>

          {settingsTabs
            .filter((tab) => tab.comingSoon)
            .map((tab) => (
              <TabsContent key={tab.id} value={tab.id}>
                <Card>
                  <CardContent className="py-12 text-center">
                    <tab.icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">{tab.label}</h3>
                    <p className="text-muted-foreground">
                      Esta funcionalidade estará disponível em breve
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
