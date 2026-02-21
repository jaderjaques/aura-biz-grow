import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvoices } from "@/hooks/useInvoices";
import { InvoiceWithDetails } from "@/types/financial";
import { format } from "date-fns";

interface MarkAsPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceWithDetails | null;
}

interface PaymentFormData {
  payment_date: string;
  payment_method: string;
  transaction_id: string;
  notes: string;
}

export function MarkAsPaidDialog({ open, onOpenChange, invoice }: MarkAsPaidDialogProps) {
  const { markAsPaid } = useInvoices();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, reset } = useForm<PaymentFormData>({
    defaultValues: {
      payment_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: invoice?.payment_method || "",
      transaction_id: "",
      notes: "",
    },
  });

  const formatCurrency = (value: number | null) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (!invoice) return;

    let proofUrl: string | undefined;

    // Upload receipt file if provided
    if (receiptFile) {
      const fileExt = receiptFile.name.split(".").pop();
      const fileName = `proofs/${invoice.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(fileName, receiptFile);

      if (uploadError) {
        console.error("Erro ao fazer upload:", uploadError);
      } else {
        const { data: urlData } = supabase.storage
          .from("invoices")
          .getPublicUrl(fileName);
        proofUrl = urlData.publicUrl;
      }
    }

    await markAsPaid.mutateAsync({
      invoiceId: invoice.id,
      paymentDate: data.payment_date,
      paymentMethod: data.payment_method,
      transactionId: data.transaction_id || undefined,
      notes: data.notes || undefined,
      proofUrl,
    });

    reset();
    setReceiptFile(null);
    onOpenChange(false);
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Confirmar Pagamento</DialogTitle>
          <DialogDescription>
            Fatura: {invoice.invoice_number} - {formatCurrency(invoice.total_amount)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment_date">Data do Pagamento *</Label>
            <Input
              id="payment_date"
              type="date"
              max={format(new Date(), "yyyy-MM-dd")}
              {...register("payment_date", { required: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Método de Pagamento *</Label>
            <Select
              defaultValue={invoice.payment_method || ""}
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

          <div className="space-y-2">
            <Label htmlFor="transaction_id">ID da Transação</Label>
            <Input
              id="transaction_id"
              placeholder="Código de confirmação, NSU, etc"
              {...register("transaction_id")}
            />
          </div>

          <div className="space-y-2">
            <Label>Comprovante (opcional)</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {receiptFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm">{receiptFile.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Clique para fazer upload</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleReceiptUpload}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Notas sobre o pagamento..."
              {...register("notes")}
            />
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Ao confirmar, a fatura será marcada como paga e o LTV do cliente será atualizado.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={markAsPaid.isPending}
              className="bg-gradient-to-r from-[#10B981] to-[#059669]"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {markAsPaid.isPending ? "Confirmando..." : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
