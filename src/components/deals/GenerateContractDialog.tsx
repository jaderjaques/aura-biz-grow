import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileSignature, Building, DollarSign } from "lucide-react";
import { DealWithDetails, getDealTotal, getDealClientName, getDealContactName } from "@/types/products";
import { useContracts } from "@/hooks/useCustomers";
import { useToast } from "@/hooks/use-toast";

interface GenerateContractDialogProps {
  deal: DealWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const BILLING_CYCLES = [
  { value: "monthly",    label: "Mensal" },
  { value: "quarterly",  label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual",     label: "Anual" },
];

const PAYMENT_METHODS = [
  { value: "boleto",       label: "Boleto" },
  { value: "pix",          label: "PIX" },
  { value: "credit_card",  label: "Cartão de Crédito" },
  { value: "transfer",     label: "Transferência Bancária" },
];

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function GenerateContractDialog({
  deal,
  open,
  onOpenChange,
  onSuccess,
}: GenerateContractDialogProps) {
  const { toast } = useToast();
  const { createContract } = useContracts(deal?.customer_id ?? undefined);

  const today = new Date().toISOString().split("T")[0];

  const [startDate,     setStartDate]     = useState(today);
  const [endDate,       setEndDate]       = useState("");
  const [billingCycle,  setBillingCycle]  = useState("monthly");
  const [paymentMethod, setPaymentMethod] = useState("boleto");
  const [paymentDay,    setPaymentDay]    = useState("10");
  const [autoRenew,     setAutoRenew]     = useState(true);
  const [notes,         setNotes]         = useState("");
  const [loading,       setLoading]       = useState(false);

  if (!deal) return null;

  const totalValue    = getDealTotal(deal);
  const recurringVal  = Number(deal.recurring_value) || 0;
  const setupVal      = Number(deal.setup_value) || 0;
  const clientName    = getDealClientName(deal);
  const contactName   = getDealContactName(deal);

  // Derive customer_id: prefer direct link, fallback to lead's customer (null if none)
  const customerId = (deal as any).customer_id as string | null;

  const handleSubmit = async () => {
    if (!startDate) {
      toast({ title: "Informe a data de início", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await createContract({
        title: `Contrato — ${deal.title}`,
        customer_id: customerId,
        deal_id: deal.id,
        start_date: startDate,
        end_date: endDate || null,
        billing_cycle: billingCycle,
        payment_method: paymentMethod,
        payment_day: Number(paymentDay) || 10,
        auto_renew: autoRenew,
        recurring_value: recurringVal || totalValue,
        setup_value: setupVal,
        status: "active",
        notes,
        products: (deal.deal_products || []).map((dp) => ({
          product_id: dp.product_id,
          name: dp.product?.name,
          quantity: dp.quantity,
          unit_price: dp.unit_price,
          is_recurring: dp.product?.is_recurring,
        })),
      });
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Gerar Contrato
          </DialogTitle>
          <DialogDescription>
            Crie um contrato ativo a partir da proposta ganha.
          </DialogDescription>
        </DialogHeader>

        {/* Deal summary */}
        <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{clientName}</span>
            {contactName && (
              <span className="text-xs text-muted-foreground">— {contactName}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{fmtCurrency(totalValue)}</span>
            {recurringVal > 0 && (
              <Badge variant="secondary" className="text-xs">
                {fmtCurrency(recurringVal)}/mês
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{deal.deal_number} · {deal.deal_products?.length || 0} produto(s)</p>
        </div>

        <Separator />

        <div className="space-y-4">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data de Início *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Data de Término <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Billing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Ciclo de Cobrança</Label>
              <Select value={billingCycle} onValueChange={setBillingCycle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BILLING_CYCLES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment day + auto renew */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <Label>Dia de Vencimento</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={paymentDay}
                onChange={(e) => setPaymentDay(e.target.value)}
                placeholder="10"
              />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Switch
                id="auto-renew"
                checked={autoRenew}
                onCheckedChange={setAutoRenew}
              />
              <Label htmlFor="auto-renew">Renovação Automática</Label>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              rows={3}
              placeholder="Condições especiais, cláusulas adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Criando..." : "Gerar Contrato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
