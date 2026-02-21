import { useState, useEffect } from "react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Send,
  FileText,
  Calendar,
  DollarSign,
  Building2,
  User,
  Mail,
  History,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InvoiceWithDetails } from "@/types/financial";
import { MarkAsPaidDialog } from "./MarkAsPaidDialog";

interface InvoiceDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceWithDetails | null;
  onUpdate?: () => void;
}

interface HistoryEntry {
  id: string;
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  created_by: string | null;
  profile?: { full_name: string } | null;
}

export function InvoiceDetailsSheet({
  open,
  onOpenChange,
  invoice,
  onUpdate,
}: InvoiceDetailsSheetProps) {
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showMarkAsPaid, setShowMarkAsPaid] = useState(false);

  useEffect(() => {
    if (open && invoice) {
      loadHistory(invoice.id);
    }
  }, [open, invoice]);

  async function loadHistory(invoiceId: string) {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("invoice_history")
        .select("*, profile:profiles(full_name)")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory((data as unknown as HistoryEntry[]) || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleCancel() {
    if (!invoice) return;
    if (!confirm("Tem certeza que deseja cancelar esta fatura?")) return;

    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "cancelled" })
        .eq("id", invoice.id);

      if (error) throw error;
      toast({ title: "Fatura cancelada com sucesso" });
      onUpdate?.();
      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        title: "Erro ao cancelar fatura",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }

  async function handleMarkSent() {
    if (!invoice) return;
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", invoice.id);

      if (error) throw error;
      toast({ title: "Fatura marcada como enviada" });
      onUpdate?.();
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }

  if (!invoice) return null;

  const isOverdue =
    (invoice.status === "pending" || invoice.status === "sent") &&
    new Date(invoice.due_date) < new Date();
  const daysOverdue = isOverdue
    ? differenceInDays(new Date(), new Date(invoice.due_date))
    : 0;

  const formatCurrency = (value: number | null) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);

  const getStatusInfo = () => {
    if (isOverdue)
      return {
        label: "Vencida",
        color: "bg-destructive text-destructive-foreground",
        icon: AlertCircle,
      };
    const map: Record<
      string,
      { label: string; color: string; icon: typeof Clock }
    > = {
      pending: {
        label: "Pendente",
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
        icon: Clock,
      },
      sent: {
        label: "Enviada",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
        icon: Send,
      },
      paid: {
        label: "Paga",
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
        icon: CheckCircle,
      },
      cancelled: {
        label: "Cancelada",
        color: "bg-muted text-muted-foreground",
        icon: XCircle,
      },
    };
    return map[invoice.status || "pending"] || map.pending;
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

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

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return "-";
    const labels: Record<string, string> = {
      boleto: "Boleto",
      pix: "PIX",
      card: "Cartão",
      bank_transfer: "Transferência",
    };
    return labels[method] || method;
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, typeof Clock> = {
      created: FileText,
      paid: CheckCircle,
      cancelled: XCircle,
      sent: Send,
    };
    return icons[action] || History;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      created: "text-blue-500",
      paid: "text-green-500",
      cancelled: "text-destructive",
      sent: "text-purple-500",
    };
    return colors[action] || "text-muted-foreground";
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl">
                {invoice.invoice_number || `#${invoice.id.slice(0, 8)}`}
              </SheetTitle>
              <Badge className={statusInfo.color}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {statusInfo.label}
              </Badge>
            </div>
            {isOverdue && (
              <p className="text-sm text-destructive font-medium">
                Vencida há {daysOverdue} {daysOverdue === 1 ? "dia" : "dias"}
              </p>
            )}
          </SheetHeader>

          <Tabs defaultValue="details" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="history">
                Histórico ({history.length})
              </TabsTrigger>
            </TabsList>

            {/* DETAILS TAB */}
            <TabsContent value="details" className="space-y-4 mt-4">
              {/* Value Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Valor Total
                    </p>
                    <p className="text-3xl font-bold mt-1">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Subtotal: {formatCurrency(invoice.amount)}</span>
                      {(invoice.discount_amount || 0) > 0 && (
                        <span>
                          Desc: -{formatCurrency(invoice.discount_amount)}
                        </span>
                      )}
                      {(invoice.tax_amount || 0) > 0 && (
                        <span>
                          Impostos: +{formatCurrency(invoice.tax_amount)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Info */}
              {invoice.customer && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {invoice.customer.company_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {invoice.customer.contact_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {invoice.customer.email}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Invoice Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Informações da Fatura
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tipo</p>
                      <p className="font-medium">
                        {getTypeLabel(invoice.invoice_type)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Emissão</p>
                      <p className="font-medium">
                        {invoice.issue_date
                          ? format(new Date(invoice.issue_date), "dd/MM/yyyy")
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vencimento</p>
                      <p
                        className={`font-medium ${isOverdue ? "text-destructive" : ""}`}
                      >
                        {format(new Date(invoice.due_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Forma Pagamento</p>
                      <p className="font-medium">
                        {getPaymentMethodLabel(invoice.payment_method)}
                      </p>
                    </div>
                    {invoice.contract && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Contrato</p>
                        <p className="font-medium">
                          {invoice.contract.contract_number} -{" "}
                          {invoice.contract.title}
                        </p>
                      </div>
                    )}
                    {invoice.is_recurring && (
                      <div className="col-span-2">
                        <Badge variant="secondary">
                          <Calendar className="mr-1 h-3 w-3" />
                          Fatura Recorrente
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Info (if paid) */}
              {invoice.status === "paid" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                      <CreditCard className="h-4 w-4" />
                      Pagamento Confirmado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">
                          Data do Pagamento
                        </p>
                        <p className="font-medium">
                          {invoice.payment_date
                            ? format(
                                new Date(invoice.payment_date),
                                "dd/MM/yyyy"
                              )
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Método</p>
                        <p className="font-medium">
                          {getPaymentMethodLabel(invoice.payment_method)}
                        </p>
                      </div>
                      {invoice.payment_confirmation && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">
                            Comprovante/ID
                          </p>
                          <p className="font-medium font-mono text-xs">
                            {invoice.payment_confirmation}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {(invoice.description || invoice.notes) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      Observações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {invoice.description && (
                      <p className="text-sm mb-2">{invoice.description}</p>
                    )}
                    {invoice.notes && (
                      <p className="text-sm text-muted-foreground">
                        {invoice.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <Separator />
              <div className="flex flex-col gap-2">
                {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => setShowMarkAsPaid(true)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirmar Pagamento
                    </Button>
                    {invoice.status === "pending" && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleMarkSent}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Marcar como Enviada
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleCancel}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancelar Fatura
                    </Button>
                  </>
                )}
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar PDF
                </Button>
              </div>
            </TabsContent>

            {/* HISTORY TAB */}
            <TabsContent value="history" className="mt-4">
              {loadingHistory ? (
                <p className="text-center text-muted-foreground py-8">
                  Carregando histórico...
                </p>
              ) : history.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-10 w-10 mx-auto text-muted-foreground opacity-50 mb-2" />
                  <p className="text-muted-foreground">
                    Nenhum registro encontrado
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {history.map((entry) => {
                    const ActionIcon = getActionIcon(entry.action);
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50"
                      >
                        <ActionIcon
                          className={`h-5 w-5 mt-0.5 ${getActionColor(entry.action)}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {entry.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span>
                              {format(
                                new Date(entry.created_at),
                                "dd/MM/yyyy 'às' HH:mm",
                                { locale: ptBR }
                              )}
                            </span>
                            {entry.profile?.full_name && (
                              <>
                                <span>•</span>
                                <span>{entry.profile.full_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <MarkAsPaidDialog
        open={showMarkAsPaid}
        onOpenChange={(open) => {
          setShowMarkAsPaid(open);
          if (!open) {
            onUpdate?.();
            loadHistory(invoice.id);
          }
        }}
        invoice={invoice}
      />
    </>
  );
}
