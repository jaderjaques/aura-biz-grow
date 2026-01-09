import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useInvoices } from "@/hooks/useInvoices";
import { InvoiceWithDetails } from "@/types/financial";
import { format } from "date-fns";

interface EditInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceWithDetails | null;
  onSuccess?: () => void;
}

interface InvoiceFormData {
  invoice_type: string;
  payment_method: string;
  amount: number;
  discount_amount: number;
  tax_amount: number;
  issue_date: string;
  due_date: string;
  description: string;
  is_recurring: boolean;
}

export function EditInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: EditInvoiceDialogProps) {
  const { updateInvoice } = useInvoices();
  const [totalAmount, setTotalAmount] = useState(0);

  const { register, handleSubmit, watch, setValue, reset } = useForm<InvoiceFormData>();

  const amount = watch("amount");
  const discountAmount = watch("discount_amount");
  const taxAmount = watch("tax_amount");

  useEffect(() => {
    const total = (Number(amount) || 0) - (Number(discountAmount) || 0) + (Number(taxAmount) || 0);
    setTotalAmount(total);
  }, [amount, discountAmount, taxAmount]);

  useEffect(() => {
    if (invoice && open) {
      reset({
        invoice_type: invoice.invoice_type,
        payment_method: invoice.payment_method || "",
        amount: Number(invoice.amount) || 0,
        discount_amount: Number(invoice.discount_amount) || 0,
        tax_amount: Number(invoice.tax_amount) || 0,
        issue_date: invoice.issue_date ? format(new Date(invoice.issue_date), "yyyy-MM-dd") : "",
        due_date: format(new Date(invoice.due_date), "yyyy-MM-dd"),
        description: invoice.description || "",
        is_recurring: invoice.is_recurring || false,
      });
      setValue("invoice_type", invoice.invoice_type);
      setValue("payment_method", invoice.payment_method || "");
    }
  }, [invoice, open, reset, setValue]);

  const onSubmit = async (data: InvoiceFormData) => {
    if (!invoice) return;

    const totalAmountCalc = Number(data.amount) - Number(data.discount_amount || 0) + Number(data.tax_amount || 0);

    await updateInvoice.mutateAsync({
      id: invoice.id,
      invoice_type: data.invoice_type,
      payment_method: data.payment_method,
      amount: Number(data.amount),
      discount_amount: Number(data.discount_amount) || 0,
      tax_amount: Number(data.tax_amount) || 0,
      total_amount: totalAmountCalc,
      issue_date: data.issue_date,
      due_date: data.due_date,
      description: data.description,
      is_recurring: data.is_recurring,
    });

    onSuccess?.();
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Fatura {invoice.invoice_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo e Método de Pagamento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Fatura *</Label>
              <Select
                value={watch("invoice_type")}
                onValueChange={(value) => setValue("invoice_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="setup">Setup (uma vez)</SelectItem>
                  <SelectItem value="monthly">Mensalidade</SelectItem>
                  <SelectItem value="addon">Add-on / Extra</SelectItem>
                  <SelectItem value="consulting">Consultoria</SelectItem>
                  <SelectItem value="adjustment">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento *</Label>
              <Select
                value={watch("payment_method")}
                onValueChange={(value) => setValue("payment_method", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="bank_transfer">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Valor Base (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("amount", { required: true, min: 0.01 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Desconto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("discount_amount")}
              />
            </div>

            <div className="space-y-2">
              <Label>Taxas (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("tax_amount")}
              />
            </div>
          </div>

          {/* Total */}
          <Card className="bg-primary/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Valor Total:</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Emissão *</Label>
              <Input
                type="date"
                {...register("issue_date", { required: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Vencimento *</Label>
              <Input
                type="date"
                {...register("due_date", { required: true })}
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              placeholder="Descrição dos serviços/produtos..."
              {...register("description")}
            />
          </div>

          {/* Recorrente */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_recurring_edit"
              checked={watch("is_recurring")}
              onCheckedChange={(checked) => setValue("is_recurring", !!checked)}
            />
            <Label htmlFor="is_recurring_edit" className="font-normal">
              Fatura recorrente
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateInvoice.isPending}
            >
              {updateInvoice.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
