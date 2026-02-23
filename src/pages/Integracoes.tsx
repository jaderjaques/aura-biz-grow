import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Calendar, Check, Loader2, ExternalLink, Plug, CheckCircle2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function IntegracoesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["profile-google-calendar", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("google_calendar_connected, email")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
          google_calendar_connected: false,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-google-calendar"] });
      toast.success("Google Calendar desconectado");
    },
    onError: () => {
      toast.error("Erro ao desconectar");
    },
  });

  const handleConnect = () => {
    const clientId = "1075042757758-4v85dipv2a5ledandiu3ap6ks31vq0cf.apps.googleusercontent.com";

    console.log('🔍 DEBUG - Client ID:', clientId);
    console.log('🔍 DEBUG - Client ID length:', clientId?.length);
    console.log('🔍 DEBUG - Client ID type:', typeof clientId);

    const redirectUri = `${window.location.origin}/google-calendar/callback`;
    const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${user?.id}`;

    console.log('🔍 DEBUG - Auth URL:', authUrl);

    window.location.href = authUrl;
  };

  const isConnected = profileData?.google_calendar_connected;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground">
            Conecte serviços externos ao CRM
          </p>
        </div>

        {/* Google Calendar Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Google Calendar</CardTitle>
                  <CardDescription>
                    Sincronize agendamentos automaticamente e gere links do Google Meet
                  </CardDescription>

                  {isLoading ? (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verificando conexão...
                    </div>
                  ) : isConnected ? (
                    <div className="mt-2 space-y-1">
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        <Check className="h-3 w-3 mr-1" />
                        Conectado
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Email: {profileData?.email}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">Não conectado</p>
                  )}
                </div>
              </div>

              <div>
                {isConnected ? (
                  <Button
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Deseja desconectar Google Calendar?")) {
                        disconnectMutation.mutate();
                      }
                    }}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Desconectando...
                      </>
                    ) : (
                      "Desconectar"
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleConnect}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Conectar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div>
              <p className="text-sm font-medium mb-3">Benefícios da integração:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  "Links do Google Meet gerados automaticamente",
                  "Agendamentos sincronizados em tempo real",
                  "Lembretes nativos do Google Calendar",
                  "Visualização em todos os dispositivos",
                  "Edições sincronizadas automaticamente",
                  "Cancelamentos também sincronizados",
                ].map((text) => (
                  <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Como funciona */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Como funciona?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                'Clique em "Conectar" e autorize o acesso ao Google Calendar',
                "Quando criar um agendamento no CRM, ele será criado automaticamente no Google",
                "Links do Google Meet serão gerados e salvos no agendamento",
                "Edições e cancelamentos também serão sincronizados",
                "Você verá os agendamentos em qualquer dispositivo com Google Calendar",
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
