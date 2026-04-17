import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays, Users, DollarSign, TrendingUp, TrendingDown,
  MessageCircle, CheckCircle, Clock, AlertCircle, ArrowRight,
  RefreshCw, HeartPulse, Receipt, FileText, UserPlus, Inbox,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
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

function getHour(isoString: string) {
  return format(new Date(isoString), "HH:mm");
}

interface ClinicMetrics {
  // Agenda
  todayTotal: number;
  todayConfirmed: number;
  todayCompleted: number;
  todayCancelled: number;
  todayNoShow: number;
  todayPending: number;
  // MRR
  mrr: number;
  mrrGrowth: number;
  // Pacientes
  activePatients: number;
  newPatientsMonth: number;
  // Comparecimento
  attendanceRate: number;
  // Financeiro
  revenueMonth: number;
  pendingInvoices: number;
  pendingInvoicesValue: number;
  // Comunicação
  chatsToday: number;
  chatsUnanswered: number;
  // Leads hoje
  leadsToday: number;
  // Pipeline clínico
  orcamentosEnviados: number;
  orcamentosValor: number;
  planosAndamento: number;
  planosValor: number;
  concluidosMes: number;
  concluidosValor: number;
}

interface TodayAppointment {
  id: string;
  scheduled_for: string;
  title: string;
  client_name: string;
  status: string | null;
  assigned_to: string | null;
  assigned_name?: string;
}

export default function ClinicDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<ClinicMetrics>({
    todayTotal: 0, todayConfirmed: 0, todayCompleted: 0,
    todayCancelled: 0, todayNoShow: 0, todayPending: 0,
    mrr: 0, mrrGrowth: 0,
    activePatients: 0, newPatientsMonth: 0,
    attendanceRate: 0,
    revenueMonth: 0, pendingInvoices: 0, pendingInvoicesValue: 0,
    chatsToday: 0, chatsUnanswered: 0,
    leadsToday: 0,
    orcamentosEnviados: 0, orcamentosValor: 0,
    planosAndamento: 0, planosValor: 0,
    concluidosMes: 0, concluidosValor: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [leadSourceChart, setLeadSourceChart] = useState<{ name: string; value: number }[]>([]);

  const firstName = profile?.full_name?.split(" ")[0] || "Usuário";
  const today = new Date();
  const todayLabel = format(today, "EEEE, dd 'de' MMMM", { locale: ptBR });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadMetrics(), loadTodayAppointments(), loadLeadSource()]);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  async function loadMetrics() {
    try {
      const now = new Date();
      const todayStart = format(startOfDay(now), "yyyy-MM-dd'T'HH:mm:ss");
      const todayEnd   = format(endOfDay(now),   "yyyy-MM-dd'T'HH:mm:ss");
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd   = format(endOfMonth(now),   "yyyy-MM-dd");

      // ── Agenda de hoje ────────────────────────────────────────────────────
      const { data: todayAppts } = await supabase
        .from("appointments")
        .select("id, status")
        .gte("scheduled_for", todayStart)
        .lte("scheduled_for", todayEnd);

      const appts = todayAppts || [];
      const statusCount = (s: string) => appts.filter((a) => a.status === s).length;

      // ── Comparecimento do mês ──────────────────────────────────────────────
      const { data: monthAppts } = await supabase
        .from("appointments")
        .select("id, status")
        .gte("scheduled_for", `${monthStart}T00:00:00`)
        .lte("scheduled_for", `${monthEnd}T23:59:59`);

      const mAppts = monthAppts || [];
      const attended = mAppts.filter((a) => a.status === "completed").length;
      const scheduled = mAppts.filter((a) => !["cancelled"].includes(a.status || "")).length;
      const attendanceRate = scheduled > 0 ? (attended / scheduled) * 100 : 0;

      // ── Pacientes ─────────────────────────────────────────────────────────
      const { data: patientsData } = await supabase
        .from("patients")
        .select("id, status, created_at")
        .is("deleted_at", null);

      const activePatients = patientsData?.filter((p) => p.status === "active") || [];
      const monthPrefix = monthStart.slice(0, 7); // "yyyy-MM"
      const newThisMonth = (patientsData || []).filter(
        (p) => p.created_at && p.created_at.startsWith(monthPrefix)
      ).length;
      // MRR da clínica vem da receita do mês (calculada abaixo via cash_transactions)

      // ── Receita do mês ────────────────────────────────────────────────────
      const { data: revenue } = await supabase
        .from("cash_transactions")
        .select("amount")
        .eq("type", "revenue")
        .gte("transaction_date", monthStart)
        .lte("transaction_date", monthEnd);
      const revenueMonth = revenue?.reduce((s, t) => s + Number(t.amount), 0) || 0;

      // ── Faturas pendentes ─────────────────────────────────────────────────
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, amount, status")
        .in("status", ["pending", "overdue", "sent"]);
      const pendingInvoices = invoices?.length || 0;
      const pendingInvoicesValue = invoices?.reduce((s, i) => s + Number(i.amount), 0) || 0;

      // ── Conversas ─────────────────────────────────────────────────────────
      const { data: chatsToday } = await supabase
        .from("chats")
        .select("id")
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd);

      const { data: unanswered } = await supabase
        .from("chats")
        .select("id")
        .eq("last_message_from_me", false)
        .not("status", "eq", "archived")
        .gt("unread_count", 0);

      // ── Leads hoje ────────────────────────────────────────────────────────
      const { data: leadsToday } = await supabase
        .from("leads")
        .select("id")
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd)
        .is("deleted_at", null);

      // ── Pipeline clínico ──────────────────────────────────────────────────
      const { data: deals } = await supabase
        .from("deals")
        .select("id, stage, total_value, actual_close_date, deal_products(unit_price, quantity, discount_amount)");

      const dealTotal = (d: any) => {
        const stored = Number(d.total_value);
        if (stored > 0) return stored;
        return (d.deal_products || []).reduce(
          (s: number, dp: any) => s + Number(dp.unit_price) * Number(dp.quantity) - Number(dp.discount_amount || 0),
          0
        );
      };

      const orcamentos = (deals || []).filter((d) => d.stage === "proposta");
      const emAndamento = (deals || []).filter((d) => d.stage === "negociacao" || d.stage === "in_progress");
      const concluidos = (deals || []).filter(
        (d) => d.stage === "ganho" && d.actual_close_date && d.actual_close_date >= monthStart
      );

      setMetrics({
        todayTotal: appts.length,
        todayConfirmed: statusCount("confirmed"),
        todayCompleted: statusCount("completed"),
        todayCancelled: statusCount("cancelled"),
        todayNoShow: statusCount("no_show"),
        todayPending: statusCount("scheduled"),
        mrr: revenueMonth,
        mrrGrowth: 0, // simplificado
        activePatients: activePatients.length,
        newPatientsMonth: newThisMonth,
        attendanceRate,
        revenueMonth,
        pendingInvoices,
        pendingInvoicesValue,
        chatsToday: chatsToday?.length || 0,
        chatsUnanswered: unanswered?.length || 0,
        leadsToday: leadsToday?.length || 0,
        orcamentosEnviados: orcamentos.length,
        orcamentosValor: orcamentos.reduce((s, d) => s + dealTotal(d), 0),
        planosAndamento: emAndamento.length,
        planosValor: emAndamento.reduce((s, d) => s + dealTotal(d), 0),
        concluidosMes: concluidos.length,
        concluidosValor: concluidos.reduce((s, d) => s + dealTotal(d), 0),
      });
    } catch (err) {
      console.error("Erro ao carregar métricas da clínica:", err);
    }
  }

  async function loadTodayAppointments() {
    try {
      const now = new Date();
      const todayStart = format(startOfDay(now), "yyyy-MM-dd'T'HH:mm:ss");
      const todayEnd   = format(endOfDay(now),   "yyyy-MM-dd'T'HH:mm:ss");

      const { data } = await supabase
        .from("appointments")
        .select("id, scheduled_for, title, client_name, status, assigned_to")
        .gte("scheduled_for", todayStart)
        .lte("scheduled_for", todayEnd)
        .not("status", "eq", "cancelled")
        .order("scheduled_for", { ascending: true })
        .limit(8);

      setTodayAppointments((data || []) as TodayAppointment[]);
    } catch (err) {
      console.error("Erro ao carregar agenda:", err);
    }
  }

  async function loadLeadSource() {
    try {
      const { data } = await supabase.from("leads").select("source").is("deleted_at", null);
      const count: Record<string, number> = {};
      data?.forEach((l) => {
        const src = l.source || "Não informado";
        count[src] = (count[src] || 0) + 1;
      });
      setLeadSourceChart(Object.entries(count).map(([name, value]) => ({ name, value })));
    } catch (err) {
      console.error("Erro ao carregar leads por origem:", err);
    }
  }

  function getStatusBadge(status: string | null) {
    const map: Record<string, { label: string; class: string }> = {
      scheduled: { label: "Agendado", class: "bg-blue-100 text-blue-700 border-blue-200" },
      confirmed:  { label: "Confirmado", class: "bg-green-100 text-green-700 border-green-200" },
      completed:  { label: "Concluído", class: "bg-primary/10 text-primary border-primary/20" },
      cancelled:  { label: "Cancelado", class: "bg-red-100 text-red-700 border-red-200" },
      no_show:    { label: "Faltou", class: "bg-orange-100 text-orange-700 border-orange-200" },
    };
    const cfg = map[status || "scheduled"] || map.scheduled;
    return (
      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${cfg.class}`}>
        {cfg.label}
      </span>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-fade-in">
          <Skeleton className="h-10 w-72" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Olá, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground capitalize">{todayLabel}</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          {/* Agenda do Dia */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/agenda")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">Agenda do Dia</p>
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-bold">{metrics.todayTotal}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {metrics.todayConfirmed > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    {metrics.todayConfirmed} confirmados
                  </span>
                )}
                {metrics.todayPending > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {metrics.todayPending} agendados
                  </span>
                )}
                {metrics.todayCompleted > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    {metrics.todayCompleted} concluídos
                  </span>
                )}
                {metrics.todayNoShow > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                    {metrics.todayNoShow} faltaram
                  </span>
                )}
                {metrics.todayTotal === 0 && (
                  <span className="text-xs text-muted-foreground">Nenhum agendamento hoje</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Receita Recorrente */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/financeiro")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">Receita Recorrente</p>
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <p className="text-3xl font-bold">{formatCurrency(metrics.mrr)}</p>
              <p className="text-xs text-muted-foreground mt-2">MRR / mês</p>
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">Receita do mês: </span>
                <span className="font-medium">{formatCurrency(metrics.revenueMonth)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Pacientes Ativos */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/pacientes")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">Pacientes Ativos</p>
                <HeartPulse className="h-5 w-5 text-rose-500" />
              </div>
              <p className="text-3xl font-bold">{metrics.activePatients}</p>
              {metrics.newPatientsMonth > 0 ? (
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-success font-medium">+{metrics.newPatientsMonth}</span>
                  <span className="text-muted-foreground">novos este mês</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">Nenhum novo este mês</p>
              )}
            </CardContent>
          </Card>

          {/* Taxa de Comparecimento */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/agenda")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">Comparecimento</p>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold">{metrics.attendanceRate.toFixed(0)}%</p>
              <div className="mt-3">
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(metrics.attendanceRate, 100)}%`,
                      backgroundColor: metrics.attendanceRate >= 80
                        ? "hsl(142, 71%, 45%)"
                        : metrics.attendanceRate >= 60
                        ? "hsl(38, 92%, 50%)"
                        : "hsl(0, 84%, 60%)",
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">do mês corrente</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Centro: Agenda + Pipeline ────────────────────────────────────── */}
        <div className="grid gap-6 md:grid-cols-2">

          {/* Próximos agendamentos */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Próximos Agendamentos</CardTitle>
                  <CardDescription>Agenda de hoje</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/agenda")}>
                  Ver todos <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {todayAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-sm">Nenhum agendamento para hoje</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/agenda")}>
                    Abrir Agenda
                  </Button>
                </div>
              ) : (
                todayAppointments.map((appt, idx) => (
                  <div key={appt.id}>
                    {idx > 0 && <Separator className="my-2" />}
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[44px]">
                        <p className="text-sm font-bold text-primary leading-tight">
                          {getHour(appt.scheduled_for)}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{appt.client_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{appt.title}</p>
                      </div>
                      {getStatusBadge(appt.status)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Pipeline Clínico */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Pipeline Clínico</CardTitle>
                  <CardDescription>Orçamentos e planos ativos</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/propostas")}>
                  Ver todos <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <PipelineRow
                label="Orçamentos Enviados"
                count={metrics.orcamentosEnviados}
                value={metrics.orcamentosValor}
                color="bg-blue-500"
                onClick={() => navigate("/propostas")}
              />
              <Separator />
              <PipelineRow
                label="Planos em Andamento"
                count={metrics.planosAndamento}
                value={metrics.planosValor}
                color="bg-yellow-500"
                onClick={() => navigate("/propostas")}
              />
              <Separator />
              <PipelineRow
                label="Concluídos no Mês"
                count={metrics.concluidosMes}
                value={metrics.concluidosValor}
                color="bg-green-500"
                onClick={() => navigate("/propostas")}
              />
            </CardContent>
          </Card>
        </div>

        {/* ── Rodapé: Leads + Comunicação + Financeiro ─────────────────────── */}
        <div className="grid gap-6 md:grid-cols-3">

          {/* Leads por Origem */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Leads por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              {leadSourceChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={leadSourceChart}
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {leadSourceChart.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                  Nenhum lead cadastrado
                </div>
              )}
              {metrics.leadsToday > 0 && (
                <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                  <UserPlus className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-primary">
                    +{metrics.leadsToday} novo{metrics.leadsToday > 1 ? "s" : ""} hoje
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comunicação */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Comunicação</CardTitle>
              <CardDescription>Atividade de hoje</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                className="w-full flex items-center gap-3 rounded-lg border p-4 text-left hover:bg-muted/50 transition-colors"
                onClick={() => navigate("/inbox")}
              >
                <MessageCircle className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-xl font-bold">{metrics.chatsToday}</p>
                  <p className="text-xs text-muted-foreground">Conversas iniciadas hoje</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button
                className={`w-full flex items-center gap-3 rounded-lg border p-4 text-left hover:bg-muted/50 transition-colors ${metrics.chatsUnanswered > 0 ? "border-orange-300 bg-orange-50 dark:bg-orange-950/20" : ""}`}
                onClick={() => navigate("/inbox")}
              >
                <Inbox className={`h-5 w-5 ${metrics.chatsUnanswered > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <p className={`text-xl font-bold ${metrics.chatsUnanswered > 0 ? "text-orange-600" : ""}`}>
                    {metrics.chatsUnanswered}
                  </p>
                  <p className="text-xs text-muted-foreground">Sem resposta</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>

          {/* Financeiro */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Financeiro</CardTitle>
              <CardDescription>Resumo do mês</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="flex items-center justify-between cursor-pointer rounded-lg p-3 hover:bg-muted/50 transition-colors"
                onClick={() => navigate("/financeiro")}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Receitas do mês</p>
                    <p className="font-bold">{formatCurrency(metrics.revenueMonth)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div
                className={`flex items-center justify-between cursor-pointer rounded-lg p-3 hover:bg-muted/50 transition-colors ${metrics.pendingInvoices > 0 ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}`}
                onClick={() => navigate("/faturas")}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${metrics.pendingInvoices > 0 ? "bg-yellow-100" : "bg-muted"}`}>
                    <Receipt className={`h-4 w-4 ${metrics.pendingInvoices > 0 ? "text-yellow-600" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">A receber</p>
                    <p className={`font-bold ${metrics.pendingInvoices > 0 ? "text-yellow-700 dark:text-yellow-400" : ""}`}>
                      {formatCurrency(metrics.pendingInvoicesValue)}
                    </p>
                    <p className="text-xs text-muted-foreground">{metrics.pendingInvoices} fatura{metrics.pendingInvoices !== 1 ? "s" : ""} em aberto</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>

              <Separator />

              <div
                className="flex items-center justify-between cursor-pointer rounded-lg p-3 hover:bg-muted/50 transition-colors"
                onClick={() => navigate("/propostas")}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Planos aprovados</p>
                    <p className="font-bold">{formatCurrency(metrics.planosValor)}</p>
                    <p className="text-xs text-muted-foreground">{metrics.planosAndamento} plano{metrics.planosAndamento !== 1 ? "s" : ""} em andamento</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function PipelineRow({
  label, count, value, color, onClick,
}: {
  label: string;
  count: number;
  value: number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button className="w-full flex items-center gap-3 text-left hover:bg-muted/30 rounded-lg px-1 py-1 transition-colors" onClick={onClick}>
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold">{count}</p>
        <p className="text-xs text-muted-foreground">
          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(value)}
        </p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}
