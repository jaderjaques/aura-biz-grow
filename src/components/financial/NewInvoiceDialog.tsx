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
import { useCustomers } from "@/hooks/useCustomers";
import { useInvoices } from "@/hooks/useInvoices";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface NewInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCustomerId?: string;
}

interface InvoiceFormData {
  customer_id: string;
  contract_id?: string;
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

export function NewInvoiceDialog({
  open,
  onOpenChange,
  preselectedCustomerId,
}: NewInvoiceDialogProps) {
  const { customers } = useCustomers();
  const { createInvoice } = useInvoices();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [contracts, setContracts] = useState<Array<{ id: string; contract_number: string; title: string }>>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<InvoiceFormData>({
    defaultValues: {
      customer_id: preselectedCustomerId ?? "",
      invoice_type: "",
      payment_method: "",
      amount: 0,
      discount_amount: 0,
      tax_amount: 0,
      issue_date: format(new Date(), "yyyy-MM-dd"),
      due_date: "",
      description: "",
      is_recurring: false,
    },
  });

  const amount = watch("amount");
  const discountAmount = watch("discount_amount");
  const taxAmount = watch("tax_amount");

  useEffect(() => {
    const total = (Number(amount) || 0) - (Number(discountAmount) || 0) + (Number(taxAmount) || 0);
    setTotalAmount(total);
  }, [amount, discountAmount, taxAmount]);

  useEffect(() => {
    if (!open) return;

    if (preselectedCustomerId) {
      setSelectedCustomerId(preselectedCustomerId);
      setValue("customer_id", preselectedCustomerId, { shouldValidate: true });
      return;
    }

    // Keeps form state in sync when dialog is reopened and a customer is still selected in the UI
    if (selectedCustomerId) {
      setValue("customer_id", selectedCustomerId, { shouldValidate: true });
    }
  }, [open, preselectedCustomerId, selectedCustomerId, setValue]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadContracts(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const loadContracts = async (customerId: string) => {
    const { data } = await supabase
      .from("contracts")
      .select("id, contract_number, title")
      .eq("customer_id", customerId)
      .eq("status", "active");
    
    setContracts(data || []);
  };

  const onSubmit = async (data: InvoiceFormData) => {
    await createInvoice.mutateAsync({
      customer_id: data.customer_id,
      contract_id: data.contract_id || undefined,
      invoice_type: data.invoice_type,
      amount: Number(data.amount),
      discount_amount: Number(data.discount_amount) || 0,
      tax_amount: Number(data.tax_amount) || 0,
      due_date: data.due_date,
      issue_date: data.issue_date,
      payment_method: data.payment_method,
      description: data.description,
      is_recurring: data.is_recurring,
    });

    reset();
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Nova Fatura</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Campos controlados via setValue (Select/Checkbox) */}
          <input type="hidden" {...register("customer_id", { required: true })} />
          <input type="hidden" {...register("invoice_type", { required: true })} />
          <input type="hidden" {...register("payment_method", { required: true })} />
          <input type="hidden" {...register("contract_id")} />
          <input type="hidden" {...register("is_recurring")} />

          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="customer">Cliente *</Label>
            <Select
              value={selectedCustomerId}
              onValueChange={(value) => {
                setSelectedCustomerId(value);
                setValue("customer_id", value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contrato */}
          {contracts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="contract">Contrato Relacionado</Label>
              <Select onValueChange={(value) => setValue("contract_id", value === "none" ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum (avulsa)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (avulsa)</SelectItem>
                  {contracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.contract_number} - {contract.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tipo e Método de Pagamento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_type">Tipo de Fatura *</Label>
              <Select onValueChange={(value) => setValue("invoice_type", value)}>
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
              <Label htmlFor="payment_method">Forma de Pagamento *</Label>
              <Select onValueChange={(value) => setValue("payment_method", value)}>
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
              <Label htmlFor="amount">Valor Base (R$) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                {...register("amount", { required: true, min: 0.01 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_amount">Desconto (R$)</Label>
              <Input
                id="discount_amount"
                type="number"
                step="0.01"
                min="0"
                {...register("discount_amount")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_amount">Taxas (R$)</Label>
              <Input
                id="tax_amount"
                type="number"
                step="0.01"
                min="0"
                {...register("tax_amount")}
              />
            </div>
          </div>

          {/* Total */}
          <Card className="bg-primary/10">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Valor Total:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue_date">Data de Emissão *</Label>
              <Input
                id="issue_date"
                type="date"
                {...register("issue_date", { required: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Data de Vencimento *</Label>
              <Input
                id="due_date"
                type="date"
                min={format(new Date(), "yyyy-MM-dd")}
                {...register("due_date", { required: true })}
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Descrição dos serviços/produtos..."
              {...register("description")}
            />
          </div>

          {/* Recorrente */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_recurring"
              onCheckedChange={(checked) => setValue("is_recurring", !!checked)}
            />
            <Label htmlFor="is_recurring" className="font-normal">
              Fatura recorrente (será gerada automaticamente todo mês)
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createInvoice.isPending}
              className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C42]"
            >
              {createInvoice.isPending ? "Criando..." : "Criar Fatura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
