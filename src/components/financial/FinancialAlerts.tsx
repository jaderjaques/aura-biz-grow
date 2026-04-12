import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { format, addDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTenantModule } from "@/hooks/useTenantModule";

interface AlertItem {
  id: string;
  type: "critical" | "warning" | "info" | "success";
  category: "invoices" | "expenses" | "churn" | "cashflow" | "optimization";
  title: string;
  description: string;
  action?: {
    label: string;
    path: string;
  };
  metric?: {
    current: number;
    target?: number;
    unit: string;
  };
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

export function FinancialAlerts() {
  const navigate = useNavigate();
  const { isClinic } = useTenantModule();
  const patientsRoute = isClinic ? "/pacientes" : "/clientes";
  const patientsLabel = isClinic ? "Pacientes" : "Clientes";
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [cashflowProjection, setCashflowProjection] = useState({
    days30: 0,
    days60: 0,
    days90: 0,
  });

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const newAlerts: AlertItem[] = [];
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      const in7Days = format(addDays(today, 7), "yyyy-MM-dd");
      const currentMonth = startOfMonth(today);
      const currentMonthStr = format(currentMonth, "yyyy-MM-dd");
      const lastMonth = subMonths(currentMonth, 1);
      const lastMonthStr = format(lastMonth, "yyyy-MM-dd");
      const twoMonthsAgo = subMonths(currentMonth, 2);
      const twoMonthsAgoStr = format(twoMonthsAgo, "yyyy-MM-dd");
      const threeMonthsAgoStr = format(subMonths(today, 3), "yyyy-MM-dd");

      // Parallel fetches
      const [
        { data: overdueInvoices },
        { data: dueSoonInvoices },
        { data: currentExpenses },
        { data: lastMonthExpenses },
        { data: twoMonthsExpenses },
        { data: customers },
        { data: cancelledThisMonth },
        { data: revenuesLast3 },
        { data: expensesLast3 },
      ] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, total_amount, due_date, customer:customers(company_name)")
          .in("status", ["pending", "sent"])
          .lt("due_date", todayStr),
        supabase
          .from("invoices")
          .select("id, total_amount, due_date")
          .in("status", ["pending", "sent"])
          .gte("due_date", todayStr)
          .lte("due_date", in7Days),
        supabase
          .from("cash_transactions")
          .select("amount")
          .eq("type", "expense")
          .gte("transaction_date", currentMonthStr),
        supabase
          .from("cash_transactions")
          .select("amount")
          .eq("type", "expense")
          .gte("transaction_date", lastMonthStr)
          .lt("transaction_date", currentMonthStr),
        supabase
          .from("cash_transactions")
          .select("amount")
          .eq("type", "expense")
          .gte("transaction_date", twoMonthsAgoStr)
          .lt("transaction_date", lastMonthStr),
        supabase
          .from("customers")
          .select("id, status, monthly_value, updated_at")
          .eq("status", "active"),
        supabase
          .from("customers")
          .select("id")
          .eq("status", "cancelled")
          .gte("updated_at", currentMonthStr),
        supabase
          .from("cash_transactions")
          .select("amount")
          .eq("type", "revenue")
          .gte("transaction_date", threeMonthsAgoStr),
        supabase
          .from("cash_transactions")
          .select("amount")
          .eq("type", "expense")
          .gte("transaction_date", threeMonthsAgoStr),
      ]);

      // === OVERDUE INVOICES ===
      if (overdueInvoices && overdueInvoices.length > 0) {
        const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
        newAlerts.push({
          id: "overdue-invoices",
          type: "critical",
          category: "invoices",
          title: `${overdueInvoices.length} fatura(s) atrasada(s)`,
          description: `Total de ${formatCurrency(totalOverdue)} em atraso. Contate os ${patientsLabel.toLowerCase()} imediatamente.`,
          action: { label: "Ver Faturas", path: "/faturas" },
          metric: { current: overdueInvoices.length, unit: "faturas" },
        });
      }

      // === DUE SOON ===
      if (dueSoonInvoices && dueSoonInvoices.length > 0) {
        const totalDueSoon = dueSoonInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
        newAlerts.push({
          id: "due-soon-invoices",
          type: "warning",
          category: "invoices",
          title: `${dueSoonInvoices.length} fatura(s) vencendo em 7 dias`,
          description: `Total de ${formatCurrency(totalDueSoon)} a vencer. Envie lembretes aos ${patientsLabel.toLowerCase()}.`,
          action: { label: "Ver Faturas", path: "/faturas" },
        });
      }

      // === HIGH EXPENSES ===
      const currentTotal = currentExpenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const lastTotal = lastMonthExpenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const twoMonthsTotal = twoMonthsExpenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const avgExpenses = (lastTotal + twoMonthsTotal) / 2;

      if (currentTotal > avgExpenses * 1.2 && avgExpenses > 0) {
        const percentAbove = ((currentTotal - avgExpenses) / avgExpenses) * 100;
        newAlerts.push({
          id: "high-expenses",
          type: "warning",
          category: "expenses",
          title: "Despesas acima da média",
          description: `Despesas do mês ${percentAbove.toFixed(0)}% acima da média dos últimos 2 meses (${formatCurrency(avgExpenses)}).`,
          action: { label: "Ver Despesas", path: "/financeiro" },
          metric: { current: currentTotal, target: avgExpenses, unit: "R$" },
        });
      }

      // === CHURN ===
      const activeCustomers = customers || [];
      const churnRate =
        activeCustomers.length > 0
          ? ((cancelledThisMonth?.length || 0) / activeCustomers.length) * 100
          : 0;

      if (churnRate > 5) {
        newAlerts.push({
          id: "high-churn",
          type: "critical",
          category: "churn",
          title: "Taxa de Churn alta",
          description: `${churnRate.toFixed(1)}% dos ${patientsLabel.toLowerCase()} cancelaram este mês. Investigue os motivos e implemente ações de retenção.`,
          action: { label: `Ver ${patientsLabel}`, path: patientsRoute },
          metric: { current: churnRate, target: 5, unit: "%" },
        });
      }

      // === CASHFLOW PROJECTION ===
      const avgRevenue = (revenuesLast3?.reduce((sum, t) => sum + Number(t.amount), 0) || 0) / 3;
      const avgExpense = (expensesLast3?.reduce((sum, t) => sum + Number(t.amount), 0) || 0) / 3;
      const projection30 = avgRevenue - avgExpense;

      setCashflowProjection({
        days30: projection30,
        days60: projection30 * 2,
        days90: projection30 * 3,
      });

      if (projection30 < 0) {
        newAlerts.push({
          id: "negative-cashflow",
          type: "critical",
          category: "cashflow",
          title: "Previsão de caixa negativa",
          description: `Baseado na média dos últimos 3 meses, o saldo previsto para os próximos 30 dias é ${formatCurrency(projection30)}.`,
          action: { label: "Ver Fluxo de Caixa", path: "/financeiro" },
        });
      } else if (avgRevenue > 0 && projection30 < avgRevenue * 0.1) {
        newAlerts.push({
          id: "low-cashflow",
          type: "warning",
          category: "cashflow",
          title: "Margem de caixa baixa",
          description: `Saldo previsto para 30 dias é ${formatCurrency(projection30)}, apenas ${((projection30 / avgRevenue) * 100).toFixed(1)}% da receita média.`,
          action: { label: "Ver Projeções", path: "/financeiro" },
        });
      }

      // === OPTIMIZATION: Upsell ===
      const currentMRR = activeCustomers.reduce((sum, c) => sum + (Number(c.monthly_value) || 0), 0);
      if (currentMRR > 0 && activeCustomers.length > 0) {
        const avgTicket = currentMRR / activeCustomers.length;
        if (avgTicket < 500) {
          newAlerts.push({
            id: "upsell-opportunity",
            type: "info",
            category: "optimization",
            title: "Oportunidade de Upsell",
            description: `Ticket médio de ${formatCurrency(avgTicket)}. Considere oferecer planos ou serviços adicionais para aumentar o MRR.`,
            metric: { current: avgTicket, target: 800, unit: "R$" },
          });
        }
      }

      // === OPTIMIZATION: Many pending ===
      const totalPending = (overdueInvoices?.length || 0) + (dueSoonInvoices?.length || 0);
      if (totalPending > 5) {
        newAlerts.push({
          id: "automate-billing",
          type: "info",
          category: "optimization",
          title: "Automatize a cobrança",
          description: "Você tem muitas faturas pendentes. Configure lembretes automáticos e cobrança recorrente.",
        });
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error("Erro ao carregar alertas:", error);
      toast.error("Erro ao carregar alertas");
    } finally {
      setLoading(false);
    }
  }, [patientsRoute, patientsLabel]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const criticalAlerts = alerts.filter((a) => a.type === "critical");
  const warningAlerts = alerts.filter((a) => a.type === "warning");
  const infoAlerts = alerts.filter((a) => a.type === "info");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Central de Alertas</h2>
          <p className="text-muted-foreground">Insights e recomendações financeiras</p>
        </div>
        <div className="flex items-center gap-2">
          {criticalAlerts.length > 0 && (
            <Badge variant="destructive">{criticalAlerts.length} crítico(s)</Badge>
          )}
          {warningAlerts.length > 0 && (
            <Badge className="bg-yellow-500 text-white">{warningAlerts.length} aviso(s)</Badge>
          )}
          {infoAlerts.length > 0 && (
            <Badge variant="secondary">{infoAlerts.length} dica(s)</Badge>
          )}
          <Button variant="outline" size="icon" onClick={loadAlerts}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cashflow Projection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Projeção de Caixa
          </CardTitle>
          <CardDescription>Baseado na média dos últimos 3 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "30 dias", value: cashflowProjection.days30 },
              { label: "60 dias", value: cashflowProjection.days60 },
              { label: "90 dias", value: cashflowProjection.days90 },
            ].map((item) => (
              <div key={item.label} className="text-center p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                  {item.value >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <p className={`text-xl font-bold ${item.value >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {formatCurrency(item.value)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold text-destructive">Crítico - Ação Imediata</h3>
          </div>
          {criticalAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onNavigate={navigate} />
          ))}
        </div>
      )}

      {/* Warning Alerts */}
      {warningAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold text-yellow-600">Avisos - Atenção Necessária</h3>
          </div>
          {warningAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onNavigate={navigate} />
          ))}
        </div>
      )}

      {/* Info/Optimization Alerts */}
      {infoAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-blue-600">Oportunidades de Otimização</h3>
          </div>
          {infoAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onNavigate={navigate} />
          ))}
        </div>
      )}

      {/* No Alerts */}
      {alerts.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center space-y-3">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-semibold">Tudo sob controle!</h3>
              <p className="text-muted-foreground">
                Não há alertas no momento. Suas finanças estão em dia.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AlertCard({
  alert,
  onNavigate,
}: {
  alert: AlertItem;
  onNavigate: (path: string) => void;
}) {
  const config = {
    critical: {
      border: "border-destructive/50",
      bg: "bg-destructive/5",
      Icon: AlertTriangle,
      iconColor: "text-destructive",
    },
    warning: {
      border: "border-yellow-500/50",
      bg: "bg-yellow-500/5",
      Icon: AlertCircle,
      iconColor: "text-yellow-500",
    },
    info: {
      border: "border-blue-500/50",
      bg: "bg-blue-500/5",
      Icon: Lightbulb,
      iconColor: "text-blue-500",
    },
    success: {
      border: "border-emerald-500/50",
      bg: "bg-emerald-500/5",
      Icon: CheckCircle,
      iconColor: "text-emerald-500",
    },
  };

  const style = config[alert.type];
  const { Icon } = style;

  return (
    <Card className={`${style.border} ${style.bg}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${style.iconColor}`} />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">{alert.title}</h4>
              {alert.metric && (
                <Badge variant="outline" className="text-xs">
                  {alert.metric.current.toFixed(0)} {alert.metric.unit}
                  {alert.metric.target ? ` / ${alert.metric.target.toFixed(0)}` : ""}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{alert.description}</p>

            {alert.metric && alert.metric.target && alert.metric.target > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso</span>
                  <span>
                    {Math.min((alert.metric.current / alert.metric.target) * 100, 100).toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={Math.min((alert.metric.current / alert.metric.target) * 100, 100)}
                  className="h-2"
                />
              </div>
            )}

            {alert.action && (
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => onNavigate(alert.action!.path)}
              >
                {alert.action.label}
                <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
