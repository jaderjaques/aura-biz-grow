import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format, differenceInDays, startOfMonth, endOfMonth, subMonths, startOfQuarter, startOfYear } from "date-fns";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MoreVertical,
  Eye,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Search,
  Plus,
  Clock,
  AlertCircle,
  FileText,
  SlidersHorizontal,
  Copy,
  ChevronDown,
  FileSpreadsheet,
} from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { useCustomers } from "@/hooks/useCustomers";
import { InvoiceWithDetails } from "@/types/financial";
import { NewInvoiceDialog } from "./NewInvoiceDialog";
import { MarkAsPaidDialog } from "./MarkAsPaidDialog";
import { InvoiceDetailsSheet } from "./InvoiceDetailsSheet";
import { cn } from "@/lib/utils";
import { exportInvoicesToExcel, exportInvoicesToPDF } from "@/lib/export-utils";

export function InvoicesTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCustomer, setFilterCustomer] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [showMarkAsPaid, setShowMarkAsPaid] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const { invoices, isLoading, cancelInvoice } = useInvoices({
    status: filterStatus,
    type: filterType,
    customerId: filterCustomer !== "all" ? filterCustomer : undefined,
  });

  const { customers } = useCustomers();

  const formatCurrency = (value: number | null) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const isOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const getInvoiceStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      pending: {
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
        label: "Pendente",
      },
      sent: {
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
        label: "Enviada",
      },
      paid: {
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
        label: "Paga ✓",
      },
      overdue: {
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
        label: "Vencida!",
      },
      cancelled: {
        className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
        label: "Cancelada",
      },
      refunded: {
        className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
        label: "Reembolsada",
      },
    };
    const variant = variants[status] || variants.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const getInvoiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      setup: "Setup",
      monthly: "Mensalidade",
      addon: "Add-on",
      consulting: "Consultoria",
      adjustment: "Ajuste",
    };
    return labels[type] || type;
  };

  const filterByPeriod = (invoice: InvoiceWithDetails) => {
    if (filterPeriod === "all") return true;
    const issueDate = invoice.issue_date ? new Date(invoice.issue_date) : new Date(invoice.created_at || "");
    const now = new Date();

    switch (filterPeriod) {
      case "this_month":
        return issueDate >= startOfMonth(now);
      case "last_month":
        return issueDate >= startOfMonth(subMonths(now, 1)) && issueDate <= endOfMonth(subMonths(now, 1));
      case "this_quarter":
        return issueDate >= startOfQuarter(now);
      case "this_year":
        return issueDate >= startOfYear(now);
      default:
        return true;
    }
  };

  const filterByPaymentMethod = (invoice: InvoiceWithDetails) => {
    if (filterPaymentMethod === "all") return true;
    return invoice.payment_method === filterPaymentMethod;
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          invoice.invoice_number.toLowerCase().includes(search) ||
          invoice.customer?.company_name?.toLowerCase().includes(search) ||
          invoice.customer?.contact_name?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      if (!filterByPeriod(invoice)) return false;
      if (!filterByPaymentMethod(invoice)) return false;
      return true;
    });
  }, [invoices, searchTerm, filterPeriod, filterPaymentMethod]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pending = invoices.filter((i) => i.status === "pending" || i.status === "sent");
    const paidThisMonth = invoices.filter(
      (i) => i.status === "paid" && i.payment_date && new Date(i.payment_date) >= monthStart
    );
    const overdue = invoices.filter((i) => {
      if (i.status === "paid" || i.status === "cancelled") return false;
      const due = new Date(i.due_date);
      due.setHours(0, 0, 0, 0);
      return due < today;
    });
    const totalThisMonth = invoices.filter((i) => {
      const issueDate = i.issue_date ? new Date(i.issue_date) : new Date(i.created_at || "");
      return issueDate >= monthStart;
    });

    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0),
      paidCount: paidThisMonth.length,
      paidAmount: paidThisMonth.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0),
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0),
      totalCount: totalThisMonth.length,
      totalAmount: totalThisMonth.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0),
    };
  }, [invoices]);

  const handleMarkAsPaid = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setShowMarkAsPaid(true);
  };

  const handleCancel = async (invoiceId: string) => {
    if (confirm("Tem certeza que deseja cancelar esta fatura?")) {
      await cancelInvoice.mutateAsync(invoiceId);
    }
  };

  function handleExportInvoices(exportFormat: 'excel' | 'pdf') {
    try {
      if (filteredInvoices.length === 0) {
        return;
      }
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const exportStats = {
        pending: {
          count: filteredInvoices.filter(i => i.status === 'pending' || i.status === 'sent').length,
          value: filteredInvoices.filter(i => i.status === 'pending' || i.status === 'sent').reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
        },
        overdue: {
          count: filteredInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.due_date) < today).length,
          value: filteredInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.due_date) < today).reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
        },
        paid: {
          count: filteredInvoices.filter(i => i.status === 'paid').length,
          value: filteredInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
        },
        cancelled: {
          count: filteredInvoices.filter(i => i.status === 'cancelled').length,
          value: filteredInvoices.filter(i => i.status === 'cancelled').reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
        },
      };

      if (exportFormat === 'excel') {
        exportInvoicesToExcel(filteredInvoices);
        toast.success('Relatório Excel gerado!');
      } else {
        exportInvoicesToPDF(filteredInvoices, exportStats);
        toast.success('Relatório PDF gerado!');
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao gerar relatório');
    }
  }

  const exportToCSV = () => {
    const headers = ["Número", "Cliente", "Tipo", "Valor", "Emissão", "Vencimento", "Status"];
    const rows = filteredInvoices.map((inv) => [
      inv.invoice_number,
      inv.customer?.company_name || "",
      getInvoiceTypeLabel(inv.invoice_type),
      inv.total_amount?.toString() || "0",
      inv.issue_date ? format(new Date(inv.issue_date), "dd/MM/yyyy") : "",
      format(new Date(inv.due_date), "dd/MM/yyyy"),
      inv.status || "pending",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `faturas_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Faturas</h1>
            <p className="text-muted-foreground">Gerencie cobranças e pagamentos</p>
          </div>
          <Button
            onClick={() => setShowNewInvoice(true)}
            className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C42]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Fatura
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold">{stats.pendingCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(stats.pendingAmount)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-[#F59E0B]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pagas (mês)</p>
                  <p className="text-2xl font-bold">{stats.paidCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(stats.paidAmount)}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-[#10B981]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vencidas</p>
                  <p className="text-2xl font-bold text-destructive">{stats.overdueCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(stats.overdueAmount)}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-[#EF4444]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total (mês)</p>
                  <p className="text-2xl font-bold">{stats.totalCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(stats.totalAmount)}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-[#8B3A8B]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Without Card Wrapper */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, cliente..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="sent">Enviadas</SelectItem>
                <SelectItem value="paid">Pagas</SelectItem>
                <SelectItem value="overdue">Vencidas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="setup">Setup</SelectItem>
                <SelectItem value="monthly">Mensalidade</SelectItem>
                <SelectItem value="addon">Add-on</SelectItem>
                <SelectItem value="consulting">Consultoria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filtros Avançados
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="grid grid-cols-3 gap-4">
                <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="this_month">Este mês</SelectItem>
                    <SelectItem value="last_month">Mês passado</SelectItem>
                    <SelectItem value="this_quarter">Este trimestre</SelectItem>
                    <SelectItem value="this_year">Este ano</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Forma Pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="card">Cartão</SelectItem>
                    <SelectItem value="bank_transfer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {filteredInvoices.length === 0
                  ? "Nenhuma fatura encontrada"
                  : `${filteredInvoices.length} ${filteredInvoices.length === 1 ? "fatura" : "faturas"}`}
              </CardTitle>
              {filteredInvoices.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExportInvoices('excel')}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportToCSV}>
                      <FileText className="mr-2 h-4 w-4" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportInvoices('pdf')}>
                      <FileText className="mr-2 h-4 w-4" />
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground font-medium">Nenhuma fatura encontrada</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tente ajustar os filtros ou criar uma nova fatura
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setShowDetails(true);
                      }}
                    >
                      <TableCell>
                        <Badge variant="outline">{invoice.invoice_number}</Badge>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.customer?.company_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.customer?.contact_name}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary">
                          {getInvoiceTypeLabel(invoice.invoice_type)}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="font-semibold">{formatCurrency(invoice.total_amount)}</p>
                          {(invoice.discount_amount || 0) > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Desc: {formatCurrency(invoice.discount_amount)}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {invoice.issue_date
                            ? format(new Date(invoice.issue_date), "dd/MM/yyyy")
                            : "-"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div>
                          <span
                            className={cn(
                              "text-sm",
                              isOverdue(invoice.due_date) &&
                                invoice.status !== "paid" &&
                                invoice.status !== "cancelled" &&
                                "text-destructive font-semibold"
                            )}
                          >
                            {format(new Date(invoice.due_date), "dd/MM/yyyy")}
                          </span>
                          {isOverdue(invoice.due_date) &&
                            invoice.status !== "paid" &&
                            invoice.status !== "cancelled" && (
                              <p className="text-xs text-destructive">
                                Venceu há {differenceInDays(new Date(), new Date(invoice.due_date))}{" "}
                                dias
                              </p>
                            )}
                        </div>
                      </TableCell>

                      <TableCell>{getInvoiceStatusBadge(invoice.status || "pending")}</TableCell>

                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDetails(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Baixar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Send className="mr-2 h-4 w-4" />
                              Enviar por Email
                            </DropdownMenuItem>
                            {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                  Marcar como Paga
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleCancel(invoice.id)}
                                  className="text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancelar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <NewInvoiceDialog open={showNewInvoice} onOpenChange={setShowNewInvoice} />
      <MarkAsPaidDialog
        open={showMarkAsPaid}
        onOpenChange={setShowMarkAsPaid}
        invoice={selectedInvoice}
      />
      <InvoiceDetailsSheet
        open={showDetails}
        onOpenChange={setShowDetails}
        invoice={selectedInvoice}
        onUpdate={() => {
          // Refetch handled by query invalidation
        }}
      />
    </>
  );
}
