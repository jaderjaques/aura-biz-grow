import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, CheckCircle, XCircle, Plus, RefreshCw } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { InvoiceWithDetails } from "@/types/financial";
import { EditInvoiceDialog } from "./EditInvoiceDialog";
import { NewInvoiceDialog } from "@/components/financial/NewInvoiceDialog";
import { MarkAsPaidDialog } from "@/components/financial/MarkAsPaidDialog";

interface CustomerInvoicesTabProps {
  customerId: string;
}

export function CustomerInvoicesTab({ customerId }: CustomerInvoicesTabProps) {
  const { invoices, isLoading, refetch, cancelInvoice } = useInvoices({
    customerId,
  });
  
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithDetails | null>(null);
  const [markingPaidInvoice, setMarkingPaidInvoice] = useState<InvoiceWithDetails | null>(null);
  const [showNewInvoice, setShowNewInvoice] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status !== "paid" && status !== "cancelled";
    
    if (isOverdue) {
      return <Badge variant="destructive">Vencida</Badge>;
    }

    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "outline" },
      sent: { label: "Enviada", variant: "secondary" },
      paid: { label: "Paga", variant: "default" },
      overdue: { label: "Vencida", variant: "destructive" },
      cancelled: { label: "Cancelada", variant: "destructive" },
      refunded: { label: "Reembolsada", variant: "secondary" },
    };

    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      setup: "Setup",
      monthly: "Mensalidade",
      addon: "Add-on",
      consulting: "Consultoria",
      adjustment: "Ajuste",
    };
    return types[type] || type;
  };

  const handleMarkAsPaidClose = (open: boolean) => {
    if (!open) {
      setMarkingPaidInvoice(null);
      refetch();
    }
  };

  const handleCancel = async (invoiceId: string) => {
    await cancelInvoice.mutateAsync(invoiceId);
    refetch();
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando faturas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Faturas ({invoices.length})</h3>
        <Button size="sm" onClick={() => setShowNewInvoice(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Fatura
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          Nenhuma fatura encontrada para este cliente.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recorrente</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                <TableCell>
                  <Badge variant="outline">{getTypeLabel(invoice.invoice_type)}</Badge>
                </TableCell>
                <TableCell className="font-semibold">
                  {formatCurrency(Number(invoice.total_amount || invoice.amount))}
                </TableCell>
                <TableCell>
                  {format(new Date(invoice.due_date), "dd/MM/yyyy")}
                </TableCell>
                <TableCell>
                  {getStatusBadge(invoice.status || "pending", invoice.due_date)}
                </TableCell>
                <TableCell>
                  {invoice.is_recurring && (
                    <RefreshCw className="h-4 w-4 text-primary" />
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingInvoice(invoice)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                        <DropdownMenuItem onClick={() => setMarkingPaidInvoice(invoice)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Marcar como Paga
                        </DropdownMenuItem>
                      )}
                      {invoice.status !== "cancelled" && invoice.status !== "paid" && (
                        <DropdownMenuItem
                          onClick={() => handleCancel(invoice.id)}
                          className="text-destructive"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancelar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <EditInvoiceDialog
        open={!!editingInvoice}
        onOpenChange={(open) => !open && setEditingInvoice(null)}
        invoice={editingInvoice}
        onSuccess={() => refetch()}
      />

      <MarkAsPaidDialog
        open={!!markingPaidInvoice}
        onOpenChange={handleMarkAsPaidClose}
        invoice={markingPaidInvoice}
      />

      <NewInvoiceDialog
        open={showNewInvoice}
        onOpenChange={setShowNewInvoice}
        preselectedCustomerId={customerId}
      />
    </div>
  );
}
