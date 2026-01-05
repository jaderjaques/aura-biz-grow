import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  MoreVertical,
  Eye,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Search,
  Plus,
} from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { InvoiceWithDetails } from "@/types/financial";
import { NewInvoiceDialog } from "./NewInvoiceDialog";
import { MarkAsPaidDialog } from "./MarkAsPaidDialog";
import { cn } from "@/lib/utils";

export function InvoicesTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [showMarkAsPaid, setShowMarkAsPaid] = useState(false);

  const { invoices, isLoading, cancelInvoice } = useInvoices({
    status: filterStatus,
    type: filterType,
  });

  const formatCurrency = (value: number | null) => {
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
      refunded: "bg-purple-100 text-purple-800",
    };
    const labels: Record<string, string> = {
      pending: "Pendente",
      sent: "Enviada",
      paid: "Paga",
      overdue: "Vencida",
      cancelled: "Cancelada",
      refunded: "Reembolsada",
    };
    return <Badge className={styles[status] || ""}>{labels[status] || status}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      setup: "Setup",
      monthly: "Mensalidade",
      addon: "Add-on",
      consulting: "Consultoria",
      adjustment: "Ajuste",
    };
    return labels[type] || type;
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(search) ||
      invoice.customer?.company_name.toLowerCase().includes(search) ||
      invoice.customer?.contact_name.toLowerCase().includes(search)
    );
  });

  const handleMarkAsPaid = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setShowMarkAsPaid(true);
  };

  const handleCancel = async (invoiceId: string) => {
    if (confirm("Tem certeza que deseja cancelar esta fatura?")) {
      await cancelInvoice.mutateAsync(invoiceId);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Faturas</h1>
          <Button
            onClick={() => setShowNewInvoice(true)}
            className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C42]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Fatura
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-2">
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
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="paid">Pagas</SelectItem>
                  <SelectItem value="overdue">Vencidas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
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
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma fatura encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50">
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
                      <Badge variant="secondary">{getTypeLabel(invoice.invoice_type)}</Badge>
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="font-semibold">{formatCurrency(invoice.total_amount)}</p>
                        {(invoice.discount_amount || 0) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Desconto: {formatCurrency(invoice.discount_amount)}
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
                        {isOverdue(invoice.due_date) &&
                          invoice.status !== "paid" &&
                          invoice.status !== "cancelled" && (
                            <span className="block text-xs">
                              Vencido há {differenceInDays(new Date(), new Date(invoice.due_date))}{" "}
                              dias
                            </span>
                          )}
                      </span>
                    </TableCell>

                    <TableCell>{getStatusBadge(invoice.status || "pending")}</TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
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
                              <DropdownMenuItem onClick={() => handleCancel(invoice.id)}>
                                <XCircle className="mr-2 h-4 w-4 text-destructive" />
                                Cancelar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
