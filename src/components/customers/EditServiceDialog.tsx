import { useState, useEffect } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { Product, SelectedProduct, DealWithDetails } from "@/types/products";
import { useAuth } from "@/contexts/AuthContext";
import { useDeals } from "@/hooks/useDeals";
import { ProductSelectorDialog } from "@/components/deals/ProductSelectorDialog";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentProfile } from "@/lib/tenant-utils";
import { useToast } from "@/hooks/use-toast";

interface EditServiceDialogProps {
  deal: DealWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditServiceDialog({ deal, open, onOpenChange, onSuccess }: EditServiceDialogProps) {
  const { isAdmin } = useAuth();
  const { updateDeal, fetchDeals } = useDeals();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [formData, setFormData] = useState({
    payment_terms: "",
    expected_close_date: "",
    notes: "",
  });

  useEffect(() => {
    if (open && deal) {
      setFormData({
        payment_terms: deal.payment_terms || "",
        expected_close_date: deal.expected_close_date || deal.actual_close_date || "",
        notes: deal.notes || "",
      });
      // Mapear deal_products existentes para SelectedProduct
      const mapped: SelectedProduct[] = (deal.deal_products || []).map((dp) => ({
        product: dp.product as Product,
        quantity: dp.quantity,
        unit_price: Number(dp.unit_price),
        hasDiscount: Number(dp.discount_amount || 0) > 0,
        discount_percent: Number(dp.discount_percent || 0),
        discount_amount: Number(dp.discount_amount || 0),
        existingId: dp.id, // para saber quais são existentes
      } as any));
      setSelectedProducts(mapped);
    }
  }, [open, deal]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleProductSelect = (product: Product) => {
    setSelectedProducts([
      ...selectedProducts,
      {
        product,
        quantity: 1,
        unit_price: Number(product.base_price),
        hasDiscount: false,
        discount_percent: 0,
        discount_amount: 0,
      },
    ]);
    setShowProductSelector(false);
  };

  const updateQuantity = (index: number, value: string) => {
    const updated = [...selectedProducts];
    updated[index].quantity = parseInt(value) || 1;
    setSelectedProducts(updated);
  };

  const updatePrice = (index: number, value: string) => {
    const updated = [...selectedProducts];
    updated[index].unit_price = parseFloat(value) || 0;
    setSelectedProducts(updated);
  };

  const toggleDiscount = (index: number, checked: boolean) => {
    const updated = [...selectedProducts];
    updated[index].hasDiscount = checked;
    if (!checked) {
      updated[index].discount_percent = 0;
      updated[index].discount_amount = 0;
    }
    setSelectedProducts(updated);
  };

  const updateDiscountPercent = (index: number, value: string) => {
    const updated = [...selectedProducts];
    const percent = parseFloat(value) || 0;
    updated[index].discount_percent = percent;
    const subtotal = updated[index].unit_price * updated[index].quantity;
    updated[index].discount_amount = subtotal * (percent / 100);
    setSelectedProducts(updated);
  };

  const removeProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const calculateTotal = () =>
    selectedProducts.reduce((sum, p) => sum + p.unit_price * p.quantity - p.discount_amount, 0);

  const hasRecurring = selectedProducts.some((p) => p.product?.is_recurring);
  const recurringTotal = selectedProducts
    .filter((p) => p.product?.is_recurring)
    .reduce((sum, p) => sum + p.unit_price * p.quantity - p.discount_amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProducts.length === 0) return;
    setLoading(true);
    try {
      const profile = await getCurrentProfile();

      // Calcular totais
      let setupValue = 0, recurringValue = 0, discountTotal = 0;
      selectedProducts.forEach((p) => {
        const lineTotal = p.quantity * p.unit_price;
        const lineDiscount = p.discount_amount || 0;
        discountTotal += lineDiscount;
        if (p.product?.is_recurring) recurringValue += lineTotal - lineDiscount;
        else setupValue += lineTotal - lineDiscount;
      });

      // Atualizar deal
      await updateDeal(deal.id, {
        payment_terms: formData.payment_terms || null,
        expected_close_date: formData.expected_close_date || null,
        actual_close_date: formData.expected_close_date || null,
        notes: formData.notes || null,
        total_value: setupValue + recurringValue,
        setup_value: setupValue,
        recurring_value: recurringValue,
        discount_total: discountTotal,
      } as any);

      // Recriar deal_products: deletar antigos e inserir novos
      await supabase.from("deal_products").delete().eq("deal_id", deal.id);

      await supabase.from("deal_products").insert(
        selectedProducts.map((p) => ({
          deal_id: deal.id,
          product_id: p.product.id,
          quantity: p.quantity,
          unit_price: p.unit_price,
          discount_percent: p.discount_percent,
          discount_amount: p.discount_amount,
          tenant_id: profile.tenant_id,
        })) as any
      );

      toast({ title: "Serviço atualizado!", description: "As alterações foram salvas com sucesso." });
      fetchDeals();
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Serviço</DialogTitle>
            <DialogDescription>{deal.title}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Produtos */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Produtos / Serviços</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowProductSelector(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Adicionar Produto
                </Button>
              </div>

              {selectedProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum produto. Clique em "Adicionar Produto".
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedProducts.map((item, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 grid grid-cols-4 gap-3">
                            <div className="col-span-2">
                              <p className="font-medium text-sm">{item.product?.name}</p>
                              <p className="text-xs text-muted-foreground">{item.product?.description}</p>
                              <div className="flex gap-1 mt-1">
                                {item.product?.is_recurring && (
                                  <Badge variant="secondary" className="text-xs">Recorrente</Badge>
                                )}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Qtd</Label>
                              <Input
                                type="number" min="1"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(index, e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Preço Unit.</Label>
                              <Input
                                type="number" step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updatePrice(index, e.target.value)}
                                disabled={!item.product?.allow_custom_pricing}
                                className="h-8"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeProduct(index)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <p className="text-sm font-bold text-primary">
                              {formatCurrency(item.unit_price * item.quantity - item.discount_amount)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t flex items-center gap-2">
                          <Checkbox
                            id={`disc-${index}`}
                            checked={item.hasDiscount}
                            onCheckedChange={(c) => toggleDiscount(index, c as boolean)}
                          />
                          <Label htmlFor={`disc-${index}`} className="text-xs font-normal">Desconto</Label>
                          {item.hasDiscount && (
                            <div className="flex items-center gap-2 ml-2">
                              <Input
                                type="number"
                                max={isAdmin ? 100 : (Number(item.product?.max_discount_percent) || 100)}
                                placeholder="% desconto"
                                value={item.discount_percent.toFixed(2)}
                                onChange={(e) => updateDiscountPercent(index, e.target.value)}
                                className="h-7 w-24"
                              />
                              <span className="text-xs text-muted-foreground">
                                = {formatCurrency(item.discount_amount)}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Resumo */}
            {selectedProducts.length > 0 && (
              <Card className="bg-primary/5">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-primary text-lg">{formatCurrency(calculateTotal())}</span>
                  </div>
                  {hasRecurring && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Mensalidade recorrente:</span>
                      <span>{formatCurrency(recurringTotal)}/mês</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Condições */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Forma de Pagamento</Label>
                <Select
                  value={formData.payment_terms || "none"}
                  onValueChange={(v) => setFormData({ ...formData, payment_terms: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhum —</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="card">Cartão de Crédito</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                    <SelectItem value="installments">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || selectedProducts.length === 0}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ProductSelectorDialog
        open={showProductSelector}
        onOpenChange={setShowProductSelector}
        onSelect={handleProductSelect}
      />
    </>
  );
}
