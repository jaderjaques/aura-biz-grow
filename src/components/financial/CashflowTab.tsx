import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  ChevronDown,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { TransactionFormDialog } from "./TransactionFormDialog";
import {
  exportCashflowToExcel,
  exportToCSV,
  exportCashflowToPDF,
} from "@/lib/export-utils";
import { ptBR } from "date-fns/locale";

interface Transaction {
  id: string;
  type: "revenue" | "expense";
  amount: number;
  description: string;
  notes?: string;
  transaction_date: string;
  payment_method?: string;
  customer_id?: string;
  is_recurring: boolean;
  revenue_category?: { name: string; color: string };
  expense_category?: { name: string; color: string };
  customer?: { company_name: string };
}

interface CashflowStats {
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
}

export function CashflowTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionType, setTransactionType] = useState<"revenue" | "expense">("revenue");

  const [stats, setStats] = useState<CashflowStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netBalance: 0,
  });

  useEffect(() => {
    loadTransactions();
    loadStats();
  }, [filterMonth]);

  async function loadTransactions() {
    setLoading(true);
    try {
      const startDate = startOfMonth(new Date(filterMonth + "-01"));
      const endDate = endOfMonth(new Date(filterMonth + "-01"));

      const { data, error } = await supabase
        .from("cash_transactions")
        .select(`
          *,
          revenue_category:revenue_categories(name, color),
          expense_category:expense_categories(name, color),
          customer:customers(company_name)
        `)
        .gte("transaction_date", format(startDate, "yyyy-MM-dd"))
        .lte("transaction_date", format(endDate, "yyyy-MM-dd"))
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions((data as Transaction[]) || []);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
      toast.error("Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const startDate = startOfMonth(new Date(filterMonth + "-01"));
      const endDate = endOfMonth(new Date(filterMonth + "-01"));

      const { data, error } = await supabase.rpc("calculate_balance", {
        p_start_date: format(startDate, "yyyy-MM-dd"),
        p_end_date: format(endDate, "yyyy-MM-dd"),
      });

      if (error) throw error;

      if (data && data[0]) {
        const row = data[0] as { total_revenue: string | number; total_expenses: string | number; net_balance: string | number };
        setStats({
          totalRevenue: parseFloat(String(row.total_revenue)) || 0,
          totalExpenses: parseFloat(String(row.total_expenses)) || 0,
          netBalance: parseFloat(String(row.net_balance)) || 0,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar stats:", error);
    }
  }

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || t.type === filterType;
    return matchesSearch && matchesType;
  });

  async function deleteTransaction(id: string) {
    if (!confirm("Tem certeza que deseja deletar esta transação?")) return;

    try {
      const { error } = await supabase.from("cash_transactions").delete().eq("id", id);

      if (error) throw error;

      toast.success("Transação deletada com sucesso!");
      loadTransactions();
      loadStats();
    } catch (error) {
      console.error("Erro ao deletar transação:", error);
      toast.error("Erro ao deletar transação");
    }
  }

  function openEditDialog(transaction: Transaction) {
    setSelectedTransaction(transaction);
    setTransactionType(transaction.type);
    setIsCreateDialogOpen(true);
  }

  function openCreateDialog(type: "revenue" | "expense") {
    setSelectedTransaction(null);
    setTransactionType(type);
    setIsCreateDialogOpen(true);
  }

  function handleExport(exportFormat: 'excel' | 'csv' | 'pdf') {
    try {
      if (filteredTransactions.length === 0) {
        toast.error('Nenhuma transação para exportar');
        return;
      }
      const period = format(new Date(filterMonth + '-01'), 'MMMM-yyyy', { locale: ptBR });

      if (exportFormat === 'excel') {
        exportCashflowToExcel(filteredTransactions, filterMonth);
        toast.success('Relatório Excel gerado!');
      } else if (exportFormat === 'csv') {
        const data = filteredTransactions.map(t => ({
          'Data': format(new Date(t.transaction_date), 'dd/MM/yyyy'),
          'Tipo': t.type === 'revenue' ? 'Receita' : 'Despesa',
          'Descrição': t.description,
          'Categoria': t.revenue_category?.name || t.expense_category?.name || '-',
          'Valor': t.amount,
        }));
        exportToCSV(data, `fluxo-caixa-${filterMonth}`);
        toast.success('Relatório CSV gerado!');
      } else if (exportFormat === 'pdf') {
        exportCashflowToPDF(filteredTransactions, stats, period);
        toast.success('Relatório PDF gerado!');
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao gerar relatório');
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receitas</p>
                <p className="text-2xl font-bold text-[#10B981]">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <ArrowUpCircle className="h-8 w-8 text-[#10B981]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Despesas</p>
                <p className="text-2xl font-bold text-[#EF4444]">
                  {formatCurrency(stats.totalExpenses)}
                </p>
              </div>
              <ArrowDownCircle className="h-8 w-8 text-[#EF4444]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Líquido</p>
                <p
                  className={`text-2xl font-bold ${
                    stats.netBalance >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                  }`}
                >
                  {formatCurrency(stats.netBalance)}
                </p>
              </div>
              {stats.netBalance >= 0 ? (
                <TrendingUp className="h-8 w-8 text-[#10B981]" />
              ) : (
                <TrendingDown className="h-8 w-8 text-[#EF4444]" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar transações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="revenue">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-44"
              />
            </div>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileText className="mr-2 h-4 w-4" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => openCreateDialog("revenue")}
                className="bg-gradient-to-r from-[#10B981] to-[#059669]"
              >
                <Plus className="mr-2 h-4 w-4" />
                Receita
              </Button>
              <Button
                onClick={() => openCreateDialog("expense")}
                variant="outline"
                className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Despesa
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardDescription>
            {filteredTransactions.length}{" "}
            {filteredTransactions.length === 1 ? "transação" : "transações"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {format(new Date(transaction.transaction_date), "dd/MM/yyyy")}
                  </TableCell>

                  <TableCell>
                    <p className="font-medium">{transaction.description}</p>
                    {transaction.notes && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {transaction.notes}
                      </p>
                    )}
                  </TableCell>

                  <TableCell>
                    {transaction.type === "revenue" && transaction.revenue_category && (
                      <Badge
                        style={{ backgroundColor: transaction.revenue_category.color }}
                        className="text-white"
                      >
                        {transaction.revenue_category.name}
                      </Badge>
                    )}
                    {transaction.type === "expense" && transaction.expense_category && (
                      <Badge
                        style={{ backgroundColor: transaction.expense_category.color }}
                        className="text-white"
                      >
                        {transaction.expense_category.name}
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>{transaction.customer?.company_name || "-"}</TableCell>

                  <TableCell>
                    {transaction.type === "revenue" ? (
                      <div className="flex items-center gap-1 text-[#10B981]">
                        <ArrowUpCircle className="h-4 w-4" />
                        Receita
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[#EF4444]">
                        <ArrowDownCircle className="h-4 w-4" />
                        Despesa
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <span
                      className={`font-semibold ${
                        transaction.type === "revenue" ? "text-[#10B981]" : "text-[#EF4444]"
                      }`}
                    >
                      {transaction.type === "revenue" ? "+" : "-"}{" "}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => openEditDialog(transaction)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteTransaction(transaction.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">Nenhuma transação encontrada</p>
              <p className="text-muted-foreground">
                Clique em "Receita" ou "Despesa" para começar
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <TransactionFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        transaction={selectedTransaction}
        transactionType={transactionType}
        onSuccess={() => {
          loadTransactions();
          loadStats();
        }}
      />
    </div>
  );
}
