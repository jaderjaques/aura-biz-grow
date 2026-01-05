import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Shield, Users, Key, Bell, Building } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  created_at: string;
}

const settingsTabs = [
  { id: "roles", label: "Cargos", icon: Shield, href: "/configuracoes/roles" },
  { id: "integracoes", label: "Integrações", icon: Key, href: "/configuracoes/integracoes" },
  { id: "equipe", label: "Equipe", icon: Users, href: "/configuracoes/equipe", comingSoon: true },
  { id: "notificacoes", label: "Notificações", icon: Bell, href: "/configuracoes/notificacoes", comingSoon: true },
  { id: "empresa", label: "Empresa", icon: Building, href: "/configuracoes/empresa", comingSoon: true },
];

export default function Settings() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const currentTab = location.pathname.split("/").pop() || "roles";

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching roles:", error);
    } else {
      setRoles(data || []);
    }
    setLoading(false);
  };

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

          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Cargos do Sistema
                </CardTitle>
                <CardDescription>
                  Visualize os cargos disponíveis no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full gradient-bg flex items-center justify-center">
                            <Shield className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{role.name}</h4>
                              {role.is_system_role && (
                                <Badge variant="secondary" className="text-xs">
                                  Sistema
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {role.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground text-center">
                        Criação de cargos customizados em breve
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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
