import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, DollarSign, TrendingUp, TrendingDown,
  Briefcase, CheckCircle, Clock, AlertCircle,
  ArrowRight, RefreshCw, Target,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantModule } from "@/hooks/useTenantModule";
import ClinicDashboard from "./ClinicDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = [
  "hsl(300, 41%, 39%)",
  "hsl(18, 100%, 60%)",
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(340, 65%, 53%)",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getStageLabel(stage: string) {
  const labels: Record<string, string> = {
    contato_inicial: "Contato",
    qualificacao: "Qualificação",
    diagnostico: "Diagnóstico",
    proposta: "Proposta",
    negociacao: "Negociação",
  };
  return labels[stage] || stage;
}

interface Metrics {
  activeCustomers: number;
  customersGrowth: number;
  mrr: number;
  mrrGrowth: number;
  totalRevenue: number;
  revenueGrowth: number;
  pipelineValue: number;
  totalDeals: number;
  dealsWon: number;
  winRate: number;
  pendingTasks: number;
  overdueTasks: number;
  openTickets: number;
}

// Wrapper que escolhe o dashboard correto ANTES de qualquer hook condicional
export default function DashboardRouter() {
  const { isClinic } = useTenantModule();
  if (isClinic) return <ClinicDashboard />;
  return <AgencyDashboard />;
}

function AgencyDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const patientsRoute = "/clientes";
  const patientsLabel = "Clientes Ativos";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [metrics, setMetrics] = useState<Metrics>({
    activeCustomers: 0,
    customersGrowth: 0,
    mrr: 0,
    mrrGrowth: 0,
    totalRevenue: 0,
    revenueGrowth: 0,
    pipelineValue: 0,
    totalDeals: 0,
    dealsWon: 0,
    winRate: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    openTickets: 0,
  });

  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [leadSourceChart, setLeadSourceChart] = useState<any[]>([]);
  const [pipelineChart, setPipelineChart] = useState<any[]>([]);

  const firstName = profile?.full_name?.split(" ")[0] || "Usuário";

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    await Promise.all([loadMetrics(), loadCharts()]);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }

  async function loadMetrics() {
    try {
      const now = new Date();
      const lastMonth = subMonths(now, 1);
      const thisMonthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(lastMonth);
      const lastMonthEnd = endOfMonth(lastMonth);

      // Customers
      const { data: customers } = await supabase
        .from("customers")
        .select("id, status, monthly_value, customer_since");

      const activeCustomers = customers?.filter((c) => c.status === "active") || [];
      const lastMonthCustomers = customers?.filter(
        (c) => c.status === "active" && c.customer_since && new Date(c.customer_since) <= lastMonthEnd
      ) || [];

      const customersGrowth =
        lastMonthCustomers.length > 0
          ? ((activeCustomers.length - lastMonthCustomers.length) / lastMonthCustomers.length) * 100
          : 0;

      // MRR
      const currentMRR = activeCustomers.reduce((sum, c) => sum + (Number(c.monthly_value) || 0), 0);
      const lastMRR = lastMonthCustomers.reduce((sum, c) => sum + (Number(c.monthly_value) || 0), 0);
      const mrrGrowth = lastMRR > 0 ? ((currentMRR - lastMRR) / lastMRR) * 100 : 0;

      // Revenue this month
      const { data: thisMonthRevenue } = await supabase
        .from("cash_transactions")
        .select("amount")
        .eq("type", "revenue")
        .gte("transaction_date", format(thisMonthStart, "yyyy-MM-dd"));

      const { data: lastMonthRevenue } = await supabase
        .from("cash_transactions")
        .select("amount")
        .eq("type", "revenue")
        .gte("transaction_date", format(lastMonthStart, "yyyy-MM-dd"))
        .lte("transaction_date", format(lastMonthEnd, "yyyy-MM-dd"));

      const currentRevenue = thisMonthRevenue?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const previousRevenue = lastMonthRevenue?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Deals
      const { data: deals } = await supabase.from("deals").select("id, stage, total_value");
      const openDeals = deals?.filter((d) => !["ganho", "perdido", "cancelado"].includes(d.stage || "")) || [];
      const wonDeals = deals?.filter((d) => d.stage === "ganho") || [];
      const closedDeals = deals?.filter((d) => ["ganho", "perdido"].includes(d.stage || "")) || [];
      const winRate = closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : 0;
      const pipelineValue = openDeals.reduce((sum, d) => sum + (Number(d.total_value) || 0), 0);

      // Tasks
      const { data: tasks } = await supabase.from("tasks").select("id, status, due_date");
      const pendingTasks = tasks?.filter((t) => t.status !== "done" && t.status !== "cancelled") || [];
      const overdueTasks = pendingTasks.filter((t) => t.due_date && new Date(t.due_date) < now);

      // Tickets
      const { data: tickets } = await supabase
        .from("tickets")
        .select("id")
        .in("status", ["open", "in_progress"]);

      setMetrics({
        activeCustomers: activeCustomers.length,
        customersGrowth,
        mrr: currentMRR,
        mrrGrowth,
        totalRevenue: currentRevenue,
        revenueGrowth,
        totalDeals: deals?.length || 0,
        dealsWon: wonDeals.length,
        winRate,
        pipelineValue,
        pendingTasks: pendingTasks.length,
        overdueTasks: overdueTasks.length,
        openTickets: tickets?.length || 0,
      });
    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
    }
  }

  async function loadCharts() {
    try {
      // Revenue last 6 months
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const { data } = await supabase
          .from("cash_transactions")
          .select("amount")
          .eq("type", "revenue")
          .gte("transaction_date", format(start, "yyyy-MM-dd"))
          .lte("transaction_date", format(end, "yyyy-MM-dd"));

        const total = data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        months.push({
          month: format(date, "MMM/yy", { locale: ptBR }),
          receita: total,
        });
      }
      setRevenueChart(months);

      // Leads by source
      const { data: leads } = await supabase.from("leads").select("source").is("deleted_at", null);
      const sourceCount: Record<string, number> = {};
      leads?.forEach((lead) => {
        const source = lead.source || "Não informado";
        sourceCount[source] = (sourceCount[source] || 0) + 1;
      });
      setLeadSourceChart(Object.entries(sourceCount).map(([name, value]) => ({ name, value })));

      // Pipeline by stage
      const { data: deals } = await supabase.from("deals").select("stage, total_value");
      const stageData: Record<string, { count: number; value: number }> = {};
      deals?.forEach((deal) => {
        const stage = deal.stage || "indefinido";
        if (!stageData[stage]) stageData[stage] = { count: 0, value: 0 };
        stageData[stage].count += 1;
        stageData[stage].value += Number(deal.total_value) || 0;
      });
      setPipelineChart(
        Object.entries(stageData)
          .filter(([stage]) => !["ganho", "perdido", "cancelado"].includes(stage))
          .map(([stage, data]) => ({
            etapa: getStageLabel(stage),
            valor: data.value,
            quantidade: data.count,
          }))
      );
    } catch (error) {
      console.error("Erro ao carregar gráficos:", error);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-fade-in">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Bem-vindo, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground">
              Visão geral do negócio em tempo real
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="MRR"
            value={formatCurrency(metrics.mrr)}
            growth={metrics.mrrGrowth}
            icon={DollarSign}
            iconClass="text-success"
            onClick={() => navigate("/financeiro")}
          />
          <KpiCard
            title={patientsLabel}
            value={metrics.activeCustomers}
            growth={metrics.customersGrowth}
            icon={Users}
            iconClass="text-primary"
            onClick={() => navigate(patientsRoute)}
          />
          <KpiCard
            title="Pipeline"
            value={formatCurrency(metrics.pipelineValue)}
            subtitle={`${metrics.totalDeals} propostas abertas`}
            icon={Briefcase}
            iconClass="text-info"
            onClick={() => navigate("/propostas")}
          />
          <KpiCard
            title="Taxa de Conversão"
            value={`${metrics.winRate.toFixed(0)}%`}
            subtitle={`${metrics.dealsWon} propostas ganhas`}
            icon={Target}
            iconClass="text-secondary"
            onClick={() => navigate("/propostas")}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Revenue */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita Mensal</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueChart}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `R$${v / 1000}k`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    name="Receita"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorReceita)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline por Etapa</CardTitle>
              <CardDescription>Valor em cada etapa do funil</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pipelineChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="etapa" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `R$${v / 1000}k`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="valor" name="Valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Leads by source + Action cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Leads pie */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Leads por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              {leadSourceChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={leadSourceChart}
                      cx="50%"
                      cy="50%"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {leadSourceChart.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                  Nenhum lead cadastrado
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick action cards */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <ActionCard
                  icon={Clock}
                  value={metrics.pendingTasks}
                  label="Tarefas pendentes"
                  variant={metrics.pendingTasks > 0 ? "warning" : "default"}
                  onClick={() => navigate("/tarefas")}
                />
                <ActionCard
                  icon={AlertCircle}
                  value={metrics.overdueTasks}
                  label="Tarefas atrasadas"
                  variant={metrics.overdueTasks > 0 ? "destructive" : "default"}
                  onClick={() => navigate("/tarefas")}
                />
                <ActionCard
                  icon={CheckCircle}
                  value={metrics.openTickets}
                  label="Tickets abertos"
                  variant={metrics.openTickets > 0 ? "info" : "default"}
                  onClick={() => navigate("/tickets")}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

/* ── Sub-components ─────────────────────────────────── */

function KpiCard({
  title,
  value,
  growth,
  subtitle,
  icon: Icon,
  iconClass,
  onClick,
}: {
  title: string;
  value: string | number;
  growth?: number;
  subtitle?: string;
  icon: React.ElementType;
  iconClass?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={onClick ? "cursor-pointer hover:shadow-lg transition-shadow" : ""}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className={`h-5 w-5 ${iconClass || "text-muted-foreground"}`} />
        </div>
        <p className="text-2xl font-bold mt-2">{value}</p>
        {growth !== undefined && (
          <div className="flex items-center gap-1 mt-2 text-sm">
            {growth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span className={growth >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>
              {growth >= 0 ? "+" : ""}
              {Math.abs(growth).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs mês anterior</span>
          </div>
        )}
        {subtitle && <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function ActionCard({
  icon: Icon,
  value,
  label,
  variant = "default",
  onClick,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  variant?: "default" | "warning" | "destructive" | "info";
  onClick?: () => void;
}) {
  const variantClasses: Record<string, string> = {
    default: "text-muted-foreground",
    warning: "text-warning",
    destructive: "text-destructive",
    info: "text-info",
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 w-full"
    >
      <Icon className={`h-5 w-5 ${variantClasses[variant]}`} />
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
    </button>
  );
}
