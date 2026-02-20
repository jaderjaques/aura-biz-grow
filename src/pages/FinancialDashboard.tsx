import { useState, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  MoreVertical,
  Eye,
  CheckCircle,
  Send,
  Download,
  AlertTriangle,
  Info,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Users,
  BarChart3,
  Target,
} from "lucide-react";
import { CashflowTab } from "@/components/financial/CashflowTab";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useInvoices, useFinancialMetrics, useFinancialAlerts } from "@/hooks/useInvoices";
import { NewInvoiceDialog } from "@/components/financial/NewInvoiceDialog";
import { MarkAsPaidDialog } from "@/components/financial/MarkAsPaidDialog";
import { InvoiceWithDetails } from "@/types/financial";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface CashflowMonth {
  month: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

interface CategoryData {
  categoria: string;
  valor: number;
}

interface ProjectionData {
  month: string;
  projecao: number;
}

export default function FinancialDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [showMarkAsPaid, setShowMarkAsPaid] = useState(false);

  const { data: metrics, isLoading: metricsLoading } = useFinancialMetrics();
  const { invoices } = useInvoices();
  const { alerts, resolveAlert } = useFinancialAlerts();

  // Real chart data state
  const [cashflowChart, setCashflowChart] = useState<CashflowMonth[]>([]);
  const [categoryChart, setCategoryChart] = useState<CategoryData[]>([]);
  const [projectionChart, setProjectionChart] = useState<ProjectionData[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  // Extra metrics
  const [extraMetrics, setExtraMetrics] = useState({
    activeCustomers: 0,
    avgTicket: 0,
    churnRate: 0,
    totalExpenses: 0,
    totalRevenue: 0,
    netBalance: 0,
  });

  const recentInvoices = invoices.slice(0, 10);

  const formatCurrency = (value: number | null | undefined) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    const labels: Record<string, string> = {
      pending: "Pendente",
      sent: "Enviada",
      paid: "Paga",
      overdue: "Vencida",
      cancelled: "Cancelada",
    };
    return <Badge className={styles[status] || ""}>{labels[status] || status}</Badge>;
  };

  const loadCharts = useCallback(async () => {
    setChartsLoading(true);
    try {
      const baseDate = new Date(selectedMonth + "-01");

      // ===== CASHFLOW 6 MONTHS =====
      const months: CashflowMonth[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(baseDate, i);
        const start = format(startOfMonth(date), "yyyy-MM-dd");
        const end = format(endOfMonth(date), "yyyy-MM-dd");

        const [{ data: revenues }, { data: expenses }] = await Promise.all([
          supabase
            .from("cash_transactions")
            .select("amount")
            .eq("type", "revenue")
            .gte("transaction_date", start)
            .lte("transaction_date", end),
          supabase
            .from("cash_transactions")
            .select("amount")
            .eq("type", "expense")
            .gte("transaction_date", start)
            .lte("transaction_date", end),
        ]);

        const revenueTotal = revenues?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const expenseTotal = expenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        months.push({
          month: format(date, "MMM/yy", { locale: ptBR }),
          receitas: revenueTotal,
          despesas: expenseTotal,
          saldo: revenueTotal - expenseTotal,
        });
      }
      setCashflowChart(months);

      // ===== CURRENT MONTH TOTALS =====
      const currentStart = format(startOfMonth(baseDate), "yyyy-MM-dd");
      const currentEnd = format(endOfMonth(baseDate), "yyyy-MM-dd");

      const [{ data: curRevenues }, { data: curExpenses }] = await Promise.all([
        supabase
          .from("cash_transactions")
          .select("amount")
          .eq("type", "revenue")
          .gte("transaction_date", currentStart)
          .lte("transaction_date", currentEnd),
        supabase
          .from("cash_transactions")
          .select("amount")
          .eq("type", "expense")
          .gte("transaction_date", currentStart)
          .lte("transaction_date", currentEnd),
      ]);

      const totalRevenue = curRevenues?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const totalExpenses = curExpenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // ===== CUSTOMERS =====
      const { data: customers } = await supabase
        .from("customers")
        .select("monthly_value, status, updated_at");

      const activeCustomers = customers?.filter((c) => c.status === "active") || [];
      const currentMRR = activeCustomers.reduce((sum, c) => sum + (Number(c.monthly_value) || 0), 0);
      const avgTicket = activeCustomers.length > 0 ? currentMRR / activeCustomers.length : 0;

      const cancelledThisMonth = customers?.filter(
        (c) =>
          c.status === "cancelled" &&
          c.updated_at &&
          c.updated_at >= currentStart &&
          c.updated_at <= currentEnd
      ) || [];
      const churnRate =
        activeCustomers.length > 0
          ? (cancelledThisMonth.length / activeCustomers.length) * 100
          : 0;

      setExtraMetrics({
        activeCustomers: activeCustomers.length,
        avgTicket,
        churnRate,
        totalRevenue,
        totalExpenses,
        netBalance: totalRevenue - totalExpenses,
      });

      // ===== EXPENSES BY CATEGORY =====
      const { data: expensesByCategory } = await supabase
        .from("cash_transactions")
        .select(`amount, expense_category:expense_categories(name)`)
        .eq("type", "expense")
        .gte("transaction_date", currentStart)
        .lte("transaction_date", currentEnd);

      const categoryTotals: Record<string, number> = {};
      expensesByCategory?.forEach((t) => {
        const cat = (t.expense_category as any)?.name || "Sem categoria";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount);
      });
      setCategoryChart(
        Object.entries(categoryTotals).map(([categoria, valor]) => ({ categoria, valor }))
      );

      // ===== PROJECTION =====
      const avgRevenue = months.reduce((s, m) => s + m.receitas, 0) / Math.max(months.length, 1);
      const avgExp = months.reduce((s, m) => s + m.despesas, 0) / Math.max(months.length, 1);
      const proj: ProjectionData[] = [];
      for (let i = 1; i <= 3; i++) {
        const projDate = new Date(baseDate);
        projDate.setMonth(projDate.getMonth() + i);
        proj.push({
          month: format(projDate, "MMM/yy", { locale: ptBR }),
          projecao: avgRevenue - avgExp,
        });
      }
      setProjectionChart(proj);
    } catch (error) {
      console.error("Erro ao carregar gráficos:", error);
    } finally {
      setChartsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  const handleMarkAsPaid = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setShowMarkAsPaid(true);
  };

  const handleResolveAlert = async (alertId: string) => {
    await resolveAlert.mutateAsync({ alertId });
  };

  const invoiceStatusData = [
    { name: "Pagas", value: metrics?.invoicesPaid || 0, color: "#10B981" },
    { name: "Pendentes", value: metrics?.pendingCount || 0, color: "#F59E0B" },
    { name: "Vencidas", value: metrics?.overdueCount || 0, color: "#EF4444" },
  ];

  const COLORS = ["#8B3A8B", "#FF6B35", "#3B82F6", "#10B981", "#F59E0B", "#EC4899"];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>
            <p className="text-muted-foreground">Visão completa das finanças</p>
          </div>

          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const date = subMonths(new Date(), i);
                  const value = format(date, "yyyy-MM");
                  return (
                    <SelectItem key={value} value={value}>
                      {format(date, "MMMM yyyy", { locale: ptBR })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={loadCharts}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => setShowNewInvoice(true)}
              className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C42]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Fatura
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard">
              <DollarSign className="mr-2 h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="cashflow">
              <Wallet className="mr-2 h-4 w-4" />
              Fluxo de Caixa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {/* KPIs Principais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/clientes")}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">MRR</p>
                    <TrendingUp className="h-4 w-4 text-success" />
                  </div>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(metrics?.mrr)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className={metrics?.mrrGrowth && metrics.mrrGrowth >= 0 ? "text-success" : "text-destructive"}>
                      {metrics?.mrrGrowth && metrics.mrrGrowth >= 0 ? "+" : ""}
                      {metrics?.mrrGrowth || 0}%
                    </span>{" "}
                    vs mês anterior
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Receitas</p>
                    <ArrowUpCircle className="h-4 w-4 text-success" />
                  </div>
                  <p className="text-2xl font-bold text-success">
                    {chartsLoading ? <Skeleton className="h-8 w-32" /> : formatCurrency(extraMetrics.totalRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: ptBR })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Despesas</p>
                    <ArrowDownCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <p className="text-2xl font-bold text-destructive">
                    {chartsLoading ? <Skeleton className="h-8 w-32" /> : formatCurrency(extraMetrics.totalExpenses)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: ptBR })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Saldo Líquido</p>
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <p className={cn("text-2xl font-bold", extraMetrics.netBalance >= 0 ? "text-success" : "text-destructive")}>
                    {chartsLoading ? <Skeleton className="h-8 w-32" /> : formatCurrency(extraMetrics.netBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Receitas - Despesas</p>
                </CardContent>
              </Card>
            </div>

            {/* Métricas Secundárias */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                      <p className="text-xl font-bold">{extraMetrics.activeCustomers}</p>
                    </div>
                    <Badge variant="secondary">Ativo</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ticket Médio</p>
                      <p className="text-xl font-bold">{formatCurrency(extraMetrics.avgTicket)}</p>
                    </div>
                    <Target className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Churn Rate</p>
                      <p className="text-xl font-bold">{extraMetrics.churnRate.toFixed(1)}%</p>
                    </div>
                    {extraMetrics.churnRate > 5 ? (
                      <Badge variant="destructive">Alto</Badge>
                    ) : (
                      <Badge variant="secondary">Normal</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/faturas")}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Inadimplência</p>
                      <p className="text-xl font-bold text-destructive">{formatCurrency(metrics?.overdueAmount)}</p>
                    </div>
                    <Badge variant="destructive">{metrics?.overdueCount || 0}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos Principais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Receitas vs Despesas */}
              <Card>
                <CardHeader>
                  <CardTitle>Receitas vs Despesas</CardTitle>
                  <CardDescription>Últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartsLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={cashflowChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelStyle={{ color: "#000" }}
                        />
                        <Legend />
                        <Bar dataKey="receitas" fill="#10B981" name="Receitas" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="despesas" fill="#EF4444" name="Despesas" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Saldo Mensal */}
              <Card>
                <CardHeader>
                  <CardTitle>Saldo Mensal</CardTitle>
                  <CardDescription>Evolução do saldo líquido</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartsLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={cashflowChart}>
                        <defs>
                          <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B3A8B" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8B3A8B" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelStyle={{ color: "#000" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="saldo"
                          stroke="#8B3A8B"
                          fill="url(#saldoGradient)"
                          strokeWidth={2}
                          name="Saldo"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Despesas por Categoria + Projeção */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Despesas por Categoria</CardTitle>
                  <CardDescription>Mês selecionado</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartsLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : categoryChart.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Nenhuma despesa registrada
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categoryChart} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="categoria" type="category" width={120} />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelStyle={{ color: "#000" }}
                        />
                        <Bar dataKey="valor" fill="#EF4444" name="Valor" radius={[0, 4, 4, 0]}>
                          {categoryChart.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Projeção de Saldo</CardTitle>
                  <CardDescription>Próximos 3 meses (baseado na média)</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartsLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={projectionChart}>
                        <defs>
                          <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelStyle={{ color: "#000" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="projecao"
                          stroke="#3B82F6"
                          fill="url(#projGradient)"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Projeção"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Status das Faturas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status das Faturas</CardTitle>
                  <CardDescription>Distribuição atual</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={invoiceStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {invoiceStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Recent Invoices mini */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Faturas Recentes</CardTitle>
                      <CardDescription>Últimas 10 faturas</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate("/faturas")}>
                      Ver Todas
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhuma fatura encontrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        recentInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell>
                              <Badge variant="outline">{invoice.invoice_number}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[120px] truncate">
                              {invoice.customer?.company_name}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(invoice.total_amount)}
                            </TableCell>
                            <TableCell>{getStatusBadge(invoice.status || "pending")}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver
                                  </DropdownMenuItem>
                                  {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                                    <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>
                                      <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                      Marcar Paga
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Alertas Pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <Alert
                        key={alert.id}
                        variant={alert.severity === "critical" ? "destructive" : "default"}
                      >
                        {alert.severity === "critical" && <AlertCircle className="h-4 w-4" />}
                        {alert.severity === "warning" && <AlertTriangle className="h-4 w-4" />}
                        {alert.severity === "info" && <Info className="h-4 w-4" />}
                        <AlertDescription className="flex justify-between items-center">
                          <span>{alert.message}</span>
                          {alert.action_required && !alert.action_taken && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolveAlert(alert.id)}
                            >
                              Resolver
                            </Button>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cashflow" className="mt-6">
            <CashflowTab />
          </TabsContent>
        </Tabs>
      </div>

      <NewInvoiceDialog open={showNewInvoice} onOpenChange={setShowNewInvoice} />
      <MarkAsPaidDialog
        open={showMarkAsPaid}
        onOpenChange={setShowMarkAsPaid}
        invoice={selectedInvoice}
      />
    </AppLayout>
  );
}
