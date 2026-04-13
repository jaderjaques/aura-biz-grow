import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Customer {
  id: string;
  company_name: string;
}

interface Transaction {
  id?: string;
  type: "revenue" | "expense";
  amount: number;
  description: string;
  notes?: string;
  transaction_date: string;
  payment_method?: string;
  customer_id?: string;
  is_recurring: boolean;
  revenue_category_id?: string;
  expense_category_id?: string;
}

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  transactionType: "revenue" | "expense";
  onSuccess: () => void;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  transactionType,
  onSuccess,
}: TransactionFormDialogProps) {
  const isEditing = transaction && transaction.id;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [formData, setFormData] = useState({
    type: transactionType,
    amount: "",
    description: "",
    notes: "",
    transaction_date: new Date().toISOString().split("T")[0],
    category_id: "",
    customer_id: "none",
    payment_method: "pix",
    is_recurring: false,
  });

  useEffect(() => {
    if (open) {
      loadCategories();
      loadCustomers();

      if (transaction && transaction.id) {
        setFormData({
          type: transaction.type || transactionType,
          amount: transaction.amount?.toString() || "",
          description: transaction.description || "",
          notes: transaction.notes || "",
          transaction_date: transaction.transaction_date || new Date().toISOString().split("T")[0],
          category_id: transaction.revenue_category_id || transaction.expense_category_id || "",
          customer_id: transaction.customer_id || "none",
          payment_method: transaction.payment_method || "pix",
          is_recurring: transaction.is_recurring || false,
        });
      } else {
        setFormData({
          type: transactionType,
          amount: "",
          description: "",
          notes: "",
          transaction_date: new Date().toISOString().split("T")[0],
          category_id: "",
          customer_id: "none",
          payment_method: "pix",
          is_recurring: false,
        });
      }
    }
  }, [open, transaction, transactionType]);

  async function loadCategories() {
    const table = transactionType === "revenue" ? "revenue_categories" : "expense_categories";
    const { data } = await supabase.from(table).select("*").eq("active", true).order("name");
    setCategories(data || []);
  }

  async function loadCustomers() {
    const { data } = await supabase
      .from("customers")
      .select("id, company_name")
      .eq("status", "active")
      .order("company_name");
    setCustomers(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const profile = await getCurrentProfile();

      let error;

      if (isEditing && transaction?.id) {
        const updateData = {
          type: transactionType as "revenue" | "expense",
          amount: parseFloat(formData.amount),
          description: formData.description,
          notes: formData.notes || null,
          transaction_date: formData.transaction_date,
          payment_method: formData.payment_method,
          customer_id: formData.customer_id === "none" ? null : formData.customer_id || null,
          is_recurring: formData.is_recurring,
          revenue_category_id: transactionType === "revenue" ? formData.category_id : null,
          expense_category_id: transactionType === "expense" ? formData.category_id : null,
        };
        ({ error } = await supabase
          .from("cash_transactions")
          .update(updateData)
          .eq("id", transaction.id));
      } else {
        const insertData = {
          type: transactionType as "revenue" | "expense",
          amount: parseFloat(formData.amount),
          description: formData.description,
          notes: formData.notes || null,
          transaction_date: formData.transaction_date,
          payment_method: formData.payment_method,
          customer_id: formData.customer_id === "none" ? null : formData.customer_id || null,
          is_recurring: formData.is_recurring,
          revenue_category_id: transactionType === "revenue" ? formData.category_id : null,
          expense_category_id: transactionType === "expense" ? formData.category_id : null,
          created_by: profile.id,
          tenant_id: profile.tenant_id,
        };
        ({ error } = await supabase.from("cash_transactions").insert([insertData]));
      }

      if (error) throw error;

      toast.success(`Transação ${isEditing ? "atualizada" : "criada"} com sucesso!`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      toast.error("Erro ao salvar transação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {transactionType === "revenue" ? (
              <>
                <ArrowUpCircle className="h-5 w-5 text-[#10B981]" />
                {isEditing ? "Editar Receita" : "Nova Receita"}
              </>
            ) : (
              <>
                <ArrowDownCircle className="h-5 w-5 text-[#EF4444]" />
                {isEditing ? "Editar Despesa" : "Nova Despesa"}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da transação"
              : "Registre uma entrada ou saída de caixa"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Pagamento cliente X"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction_date">Data *</Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Forma de Pagamento</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer">Cliente (opcional)</Label>
              <Select
                value={formData.customer_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Detalhes adicionais..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_recurring: checked as boolean })
                }
              />
              <Label htmlFor="is_recurring" className="font-normal">
                Transação recorrente (mensal)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={
                transactionType === "revenue"
                  ? "bg-gradient-to-r from-[#10B981] to-[#059669]"
                  : "bg-gradient-to-r from-[#EF4444] to-[#DC2626]"
              }
            >
              {loading ? "Salvando..." : isEditing ? "Atualizar" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
