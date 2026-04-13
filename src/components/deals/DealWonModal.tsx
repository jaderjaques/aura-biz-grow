import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentProfile } from "@/lib/tenant-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  DollarSign,
  RefreshCw,
  Building,
  Package,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { DealWithDetails } from "@/types/products";

interface DealWonModalProps {
  deal: DealWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface InvoiceConfig {
  create: boolean;
  amount: number;
  dueDate: string;
}

export function DealWonModal({ deal, isOpen, onClose, onSuccess }: DealWonModalProps) {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const { toast } = useToast();

  const [setupInvoice, setSetupInvoice] = useState<InvoiceConfig>({
    create: false,
    amount: 0,
    dueDate: "",
  });

  const [recurringInvoice, setRecurringInvoice] = useState<InvoiceConfig>({
    create: false,
    amount: 0,
    dueDate: "",
  });

  useEffect(() => {
    if (deal && isOpen) {
      loadCustomer();

      setSetupInvoice({
        create: (Number(deal.setup_value) || 0) > 0,
        amount: Number(deal.setup_value) || 0,
        dueDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      });

      setRecurringInvoice({
        create: (Number(deal.recurring_value) || 0) > 0,
        amount: Number(deal.recurring_value) || 0,
        dueDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      });
    }
  }, [deal, isOpen]);

  async function loadCustomer() {
    if (!deal) return;
    setCustomerLoading(true);
    try {
      // Try to find existing customer linked to this deal
      const { data: existingByDeal } = await supabase
        .from("customers")
        .select("*")
        .eq("deal_id", deal.id)
        .maybeSingle();

      if (existingByDeal) {
        setCustomer(existingByDeal);
        return;
      }

      // Try by lead_id
      if (deal.lead_id) {
        const { data: existingByLead } = await supabase
          .from("customers")
          .select("*")
          .eq("lead_id", deal.lead_id)
          .maybeSingle();

        if (existingByLead) {
          setCustomer(existingByLead);
          return;
        }
      }

      // No customer yet — auto-create from lead data
      const profile = await getCurrentProfile();
      const { data: newCustomer, error } = await supabase
        .from("customers")
        .insert({
          company_name: deal.lead?.company_name || deal.title,
          contact_name: deal.lead?.contact_name || "—",
          email: deal.lead?.email || "sem@email.com",
          phone: deal.lead?.phone || "—",
          status: "active",
          customer_since: new Date().toISOString().split("T")[0],
          lead_id: deal.lead_id,
          deal_id: deal.id,
          created_by: profile.id,
          account_manager: profile.id,
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;
      setCustomer(newCustomer);

      // Update lead status
      if (deal.lead_id) {
        await supabase
          .from("leads")
          .update({ status: "convertido" })
          .eq("id", deal.lead_id);
      }
    } catch (error: any) {
      console.error("Erro ao carregar/criar cliente:", error);
      toast({
        title: "Erro ao processar cliente",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCustomerLoading(false);
    }
  }

  async function handleGenerateInvoices() {
    if (!customer) {
      toast({ title: "Cliente não encontrado", variant: "destructive" });
      return;
    }

    if (!setupInvoice.create && !recurringInvoice.create) {
      toast({
        title: "Selecione pelo menos um tipo de fatura",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const profile = await getCurrentProfile();
      const invoicesToCreate: any[] = [];

      if (setupInvoice.create && setupInvoice.amount > 0) {
        invoicesToCreate.push({
          customer_id: customer.id,
          invoice_type: "setup",
          amount: setupInvoice.amount,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: setupInvoice.amount,
          issue_date: new Date().toISOString().split("T")[0],
          due_date: setupInvoice.dueDate,
          status: "pending",
          is_recurring: false,
          invoice_number: "", // auto-generated by trigger
          description: `Setup: ${deal?.title}`,
          created_by: profile.id,
          tenant_id: profile.tenant_id,
        });
      }

      if (recurringInvoice.create && recurringInvoice.amount > 0) {
        invoicesToCreate.push({
          customer_id: customer.id,
          invoice_type: "monthly",
          amount: recurringInvoice.amount,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: recurringInvoice.amount,
          issue_date: new Date().toISOString().split("T")[0],
          due_date: recurringInvoice.dueDate,
          status: "pending",
          is_recurring: true,
          invoice_number: "", // auto-generated by trigger
          description: `Mensalidade: ${deal?.title}`,
          created_by: profile.id,
          tenant_id: profile.tenant_id,
        });
      }

      const { data: createdInvoices, error: invoiceError } = await supabase
        .from("invoices")
        .insert(invoicesToCreate)
        .select();

      if (invoiceError) throw invoiceError;

      // Register cash transactions
      const cashTransactions: any[] = [];

      if (setupInvoice.create && createdInvoices?.[0]) {
        const { data: setupCategory } = await supabase
          .from("revenue_categories")
          .select("id")
          .eq("name", "Setup")
          .maybeSingle();

        cashTransactions.push({
          type: "revenue",
          revenue_category_id: setupCategory?.id || null,
          amount: setupInvoice.amount,
          description: `Setup: ${deal?.title}`,
          transaction_date: setupInvoice.dueDate,
          customer_id: customer.id,
          invoice_id: createdInvoices[0].id,
          created_by: profile.id,
          tenant_id: profile.tenant_id,
        });
      }

      const recurringIdx = setupInvoice.create ? 1 : 0;
      if (recurringInvoice.create && createdInvoices?.[recurringIdx]) {
        const { data: recurringCategory } = await supabase
          .from("revenue_categories")
          .select("id")
          .eq("name", "Mensalidades")
          .maybeSingle();

        cashTransactions.push({
          type: "revenue",
          revenue_category_id: recurringCategory?.id || null,
          amount: recurringInvoice.amount,
          description: `Mensalidade: ${deal?.title}`,
          transaction_date: recurringInvoice.dueDate,
          customer_id: customer.id,
          invoice_id: createdInvoices[recurringIdx].id,
          is_recurring: true,
          created_by: profile.id,
          tenant_id: profile.tenant_id,
        });

        // Update customer MRR
        await supabase
          .from("customers")
          .update({
            monthly_value: recurringInvoice.amount,
            status: "active",
          })
          .eq("id", customer.id);
      }

      if (cashTransactions.length > 0) {
        const { error: cashError } = await supabase
          .from("cash_transactions")
          .insert(cashTransactions);
        if (cashError) console.error("Erro ao registrar no caixa:", cashError);
      }

      // Mark deal as won
      await supabase
        .from("deals")
        .update({
          status: "won",
          stage: "ganho",
          actual_close_date: new Date().toISOString().split("T")[0],
          closed_at: new Date().toISOString(),
          probability: 100,
        })
        .eq("id", deal!.id);

      toast({
        title: "🎉 Faturas geradas com sucesso!",
        description: `${createdInvoices?.length || 0} fatura(s) criada(s)`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erro ao gerar faturas:", error);
      toast({
        title: "Erro ao gerar faturas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!deal) return null;

  const setupValue = Number(deal.setup_value) || 0;
  const recurringValue = Number(deal.recurring_value) || 0;
  const totalValue = Number(deal.total_value) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            🎉 Proposta Ganha! Gerar Faturas
          </DialogTitle>
          <DialogDescription>
            Configure as cobranças para este cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Deal Info */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">
                  {customerLoading
                    ? "Carregando..."
                    : customer?.company_name || deal.lead?.company_name || "—"}
                </span>
              </div>

              <div className="text-sm text-muted-foreground">
                Proposta: <span className="font-medium text-foreground">{deal.title}</span>
              </div>

              <Separator />

              <div className="flex gap-4 flex-wrap">
                {setupValue > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Setup</span>
                    <p className="font-semibold text-sm">{formatCurrency(setupValue)}</p>
                  </div>
                )}
                {recurringValue > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Mensalidade</span>
                    <p className="font-semibold text-sm">
                      {formatCurrency(recurringValue)}/mês
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-medium">Valor Total:</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(totalValue)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          {deal.deal_products && deal.deal_products.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Produtos/Serviços</span>
                </div>
                <div className="space-y-1">
                  {deal.deal_products.map((dp) => (
                    <div key={dp.id} className="flex justify-between text-sm">
                      <span>{dp.product?.name}</span>
                      <span className="text-muted-foreground">
                        {dp.quantity}x {formatCurrency(Number(dp.unit_price))}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Setup Invoice */}
          {setupValue > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="create_setup"
                    checked={setupInvoice.create}
                    onCheckedChange={(checked) =>
                      setSetupInvoice({ ...setupInvoice, create: !!checked })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <Label htmlFor="create_setup" className="font-medium cursor-pointer">
                          Fatura de Setup
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pagamento único de implantação
                      </p>
                    </div>

                    {setupInvoice.create && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Valor (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={setupInvoice.amount}
                            onChange={(e) =>
                              setSetupInvoice({
                                ...setupInvoice,
                                amount: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Vencimento</Label>
                          <Input
                            type="date"
                            value={setupInvoice.dueDate}
                            onChange={(e) =>
                              setSetupInvoice({ ...setupInvoice, dueDate: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recurring Invoice */}
          {recurringValue > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="create_recurring"
                    checked={recurringInvoice.create}
                    onCheckedChange={(checked) =>
                      setRecurringInvoice({ ...recurringInvoice, create: !!checked })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-primary" />
                        <Label htmlFor="create_recurring" className="font-medium cursor-pointer">
                          Fatura Recorrente (Mensalidade)
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Primeira cobrança (próximas serão automáticas)
                      </p>
                    </div>

                    {recurringInvoice.create && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Valor/Mês (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={recurringInvoice.amount}
                            onChange={(e) =>
                              setRecurringInvoice({
                                ...recurringInvoice,
                                amount: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">1º Vencimento</Label>
                          <Input
                            type="date"
                            value={recurringInvoice.dueDate}
                            onChange={(e) =>
                              setRecurringInvoice({
                                ...recurringInvoice,
                                dueDate: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Após gerar as faturas, o deal será marcado como ganho
              {recurringInvoice.create && " e o MRR do cliente será atualizado"}.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerateInvoices}
            disabled={loading || customerLoading}
            className="bg-gradient-to-r from-green-500 to-emerald-500"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Gerar Faturas
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}
