import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Target, Briefcase, DollarSign, Plus, Sparkles } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    qualifiedLeads: 0,
    activeClients: 0,
    mrr: 0,
  });

  const firstName = profile?.full_name?.split(" ")[0] || "Usuário";

  useEffect(() => {
    const fetchMetrics = async () => {
      const [totalRes, qualifiedRes] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("leads").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("status", "qualificado"),
      ]);

      setMetrics({
        totalLeads: totalRes.count || 0,
        qualifiedLeads: qualifiedRes.count || 0,
        activeClients: 0,
        mrr: 0,
      });
    };
    fetchMetrics();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Bem-vindo, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Aqui está um resumo do seu CRM
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total de Leads"
            value={metrics.totalLeads}
            description="Leads ativos no sistema"
            icon={Users}
            iconColor="primary"
          />
          <MetricCard
            title="Leads Qualificados"
            value={metrics.qualifiedLeads}
            description="Prontos para conversão"
            icon={Target}
            iconColor="secondary"
          />
          <MetricCard
            title="Clientes Ativos"
            value={metrics.activeClients}
            description="Em breve"
            icon={Briefcase}
            iconColor="success"
          />
          <MetricCard
            title="MRR"
            value="R$ 0"
            description="Em breve"
            icon={DollarSign}
            iconColor="info"
          />
        </div>

        <Card className="relative overflow-hidden border-dashed">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5" />
          <CardContent className="relative flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full gradient-bg p-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {metrics.totalLeads === 0 ? "Comece agora!" : "Continue gerenciando!"} 🎉
            </h2>
            <p className="text-muted-foreground max-w-md mb-6">
              {metrics.totalLeads === 0
                ? "Adicione seus primeiros leads para acompanhar todo o funil de vendas."
                : `Você tem ${metrics.totalLeads} leads no sistema. Continue acompanhando seu funil!`}
            </p>
            <Button
              size="lg"
              className="gradient-cta hover:opacity-90 text-white"
              onClick={() => navigate("/leads")}
            >
              <Plus className="mr-2 h-4 w-4" />
              {metrics.totalLeads === 0 ? "Adicionar Lead" : "Ver Leads"}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Atividade Recente</h3>
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <p>Nenhuma atividade recente</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Tarefas Pendentes</h3>
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <p>Nenhuma tarefa pendente</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
