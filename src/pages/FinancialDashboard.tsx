import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useInvoices, useFinancialMetrics, useFinancialAlerts } from "@/hooks/useInvoices";
import { NewInvoiceDialog } from "@/components/financial/NewInvoiceDialog";
import { MarkAsPaidDialog } from "@/components/financial/MarkAsPaidDialog";
import { InvoiceWithDetails } from "@/types/financial";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function FinancialDashboard() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState("this_month");
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [showMarkAsPaid, setShowMarkAsPaid] = useState(false);

  const { data: metrics, isLoading: metricsLoading } = useFinancialMetrics();
  const { invoices } = useInvoices();
  const { alerts, resolveAlert } = useFinancialAlerts();

  const recentInvoices = invoices.slice(0, 10);

  const formatCurrency = (value: number | null | undefined) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
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

  // Mock data for charts
  const revenueData = [
    { month: "Jul", revenue: 45000, mrr: 42000 },
    { month: "Ago", revenue: 52000, mrr: 44000 },
    { month: "Set", revenue: 48000, mrr: 45000 },
    { month: "Out", revenue: 61000, mrr: 48000 },
    { month: "Nov", revenue: 55000, mrr: 50000 },
    { month: "Dez", revenue: 67000, mrr: 52000 },
  ];

  const invoiceStatusData = [
    { name: "Pagas", value: metrics?.invoicesPaid || 0, color: "#10B981" },
    { name: "Pendentes", value: metrics?.pendingCount || 0, color: "#F59E0B" },
    { name: "Vencidas", value: metrics?.overdueCount || 0, color: "#EF4444" },
  ];

  const handleMarkAsPaid = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setShowMarkAsPaid(true);
  };

  const handleResolveAlert = async (alertId: string) => {
    await resolveAlert.mutateAsync({ alertId });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>
            <p className="text-muted-foreground">Visão geral das finanças</p>
          </div>

          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">Este mês</SelectItem>
                <SelectItem value="last_month">Mês passado</SelectItem>
                <SelectItem value="this_quarter">Este trimestre</SelectItem>
                <SelectItem value="this_year">Este ano</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => setShowNewInvoice(true)}
              className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C42]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Fatura
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <TrendingUp className="h-4 w-4 text-[#10B981]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#10B981]">
                {formatCurrency(metrics?.mrr)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className={metrics?.mrrGrowth && metrics.mrrGrowth >= 0 ? "text-green-600" : "text-red-600"}>
                  {metrics?.mrrGrowth && metrics.mrrGrowth >= 0 ? "+" : ""}
                  {metrics?.mrrGrowth || 0}%
                </span>{" "}
                vs mês anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(metrics?.monthlyRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.invoicesPaid || 0} faturas pagas este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">A Receber</CardTitle>
              <Clock className="h-4 w-4 text-[#F59E0B]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#F59E0B]">
                {formatCurrency(metrics?.pendingAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.pendingCount || 0} faturas pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
              <AlertCircle className="h-4 w-4 text-[#EF4444]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#EF4444]">
                {formatCurrency(metrics?.overdueAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.overdueCount || 0} faturas vencidas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Receita Mensal</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: "black" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8B3A8B"
                    strokeWidth={2}
                    name="Receita"
                  />
                  <Line
                    type="monotone"
                    dataKey="mrr"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="MRR"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status das Faturas</CardTitle>
              <CardDescription>Este mês</CardDescription>
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
                    outerRadius={80}
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
        </div>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Faturas Recentes</CardTitle>
                <CardDescription>Últimas 10 faturas criadas</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate("/faturas")}>
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
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma fatura encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  recentInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Badge variant="outline">{invoice.invoice_number}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{invoice.customer?.company_name}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold">{formatCurrency(invoice.total_amount)}</p>
                      </TableCell>
                      <TableCell>
                        <p
                          className={cn(
                            "text-sm",
                            isOverdue(invoice.due_date) &&
                              invoice.status !== "paid" &&
                              "text-destructive font-medium"
                          )}
                        >
                          {format(new Date(invoice.due_date), "dd/MM/yyyy")}
                        </p>
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
                              Ver Fatura
                            </DropdownMenuItem>
                            {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                              <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                Marcar como Paga
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Send className="mr-2 h-4 w-4" />
                              Enviar por Email
                            </DropdownMenuItem>
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

        {/* Quick Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Relatórios Rápidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Receita Mensal
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Faturas Vencidas
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                LTV por Cliente
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Crescimento MRR
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <NewInvoiceDialog open={showNewInvoice} onOpenChange={setShowNewInvoice} />
      <MarkAsPaidDialog
        open={showMarkAsPaid}
        onOpenChange={setShowMarkAsPaid}
        invoice={selectedInvoice}
      />
    </>
  );
}
