import { Users, Target, Briefcase, DollarSign, Plus, Sparkles } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Dashboard() {
  const { profile } = useAuth();

  const firstName = profile?.full_name?.split(" ")[0] || "Usuário";

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Welcome section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Bem-vindo, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Aqui está um resumo do seu CRM
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total de Leads"
            value={0}
            description="+0 desde o mês passado"
            icon={Users}
            iconColor="primary"
          />
          <MetricCard
            title="Leads Qualificados"
            value={0}
            description="+0 desde o mês passado"
            icon={Target}
            iconColor="secondary"
          />
          <MetricCard
            title="Clientes Ativos"
            value={0}
            description="+0 desde o mês passado"
            icon={Briefcase}
            iconColor="success"
          />
          <MetricCard
            title="MRR"
            value="R$ 0"
            description="+0% desde o mês passado"
            icon={DollarSign}
            iconColor="info"
          />
        </div>

        {/* Empty state / Welcome card */}
        <Card className="relative overflow-hidden border-dashed">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5" />
          <CardContent className="relative flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full gradient-bg p-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Seu sistema está pronto! 🎉
            </h2>
            <p className="text-muted-foreground max-w-md mb-6">
              O CRM Responde uAI está configurado. Comece adicionando seus primeiros
              leads para acompanhar todo o funil de vendas.
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="lg"
                    className="gradient-cta hover:opacity-90 text-white"
                    disabled
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Lead
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Em breve</p>
              </TooltipContent>
            </Tooltip>
          </CardContent>
        </Card>

        {/* Quick stats placeholder */}
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
