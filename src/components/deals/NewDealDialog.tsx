import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Package, Plus, Trash2 } from "lucide-react";
import { Product, SelectedProduct } from "@/types/products";
import { Lead } from "@/types/leads";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/contexts/AuthContext";
import { ProductSelectorDialog } from "./ProductSelectorDialog";

interface NewDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (dealData: any, products: SelectedProduct[]) => Promise<void>;
  lead?: Lead | null;
}

export function NewDealDialog({ open, onOpenChange, onSubmit, lead }: NewDealDialogProps) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    expected_close_date: "",
    payment_terms: "",
    probability: "50",
    notes: "",
  });

  useEffect(() => {
    if (open && lead) {
      setFormData({
        title: `Proposta - ${lead.company_name}`,
        description: "",
        expected_close_date: "",
        payment_terms: "",
        probability: "50",
        notes: "",
      });
      setSelectedProducts([]);
    }
  }, [open, lead]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "marketing":
        return "Marketing";
      case "automation":
        return "Automação";
      case "consulting":
        return "Consultoria";
      case "addon":
        return "Add-on";
      default:
        return category;
    }
  };

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
    const newProducts = [...selectedProducts];
    newProducts[index].quantity = parseInt(value) || 1;
    setSelectedProducts(newProducts);
  };

  const updatePrice = (index: number, value: string) => {
    const newProducts = [...selectedProducts];
    newProducts[index].unit_price = parseFloat(value) || 0;
    setSelectedProducts(newProducts);
  };

  const toggleDiscount = (index: number, checked: boolean) => {
    const newProducts = [...selectedProducts];
    newProducts[index].hasDiscount = checked;
    if (!checked) {
      newProducts[index].discount_percent = 0;
      newProducts[index].discount_amount = 0;
    }
    setSelectedProducts(newProducts);
  };

  const updateDiscountPercent = (index: number, value: string) => {
    const newProducts = [...selectedProducts];
    const percent = parseFloat(value) || 0;
    newProducts[index].discount_percent = percent;
    const subtotal = newProducts[index].unit_price * newProducts[index].quantity;
    newProducts[index].discount_amount = subtotal * (percent / 100);
    setSelectedProducts(newProducts);
  };

  const updateDiscountAmount = (index: number, value: string) => {
    const newProducts = [...selectedProducts];
    const amount = parseFloat(value) || 0;
    newProducts[index].discount_amount = amount;
    const subtotal = newProducts[index].unit_price * newProducts[index].quantity;
    newProducts[index].discount_percent = subtotal > 0 ? (amount / subtotal) * 100 : 0;
    setSelectedProducts(newProducts);
  };

  const removeProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return selectedProducts.reduce(
      (sum, p) => sum + p.unit_price * p.quantity,
      0
    );
  };

  const calculateTotalDiscount = () => {
    return selectedProducts.reduce((sum, p) => sum + p.discount_amount, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateTotalDiscount();
  };

  const calculateSetupTotal = () => {
    return selectedProducts
      .filter((p) => p.product.type === "setup" || p.product.type === "one_time")
      .reduce((sum, p) => sum + p.unit_price * p.quantity - p.discount_amount, 0);
  };

  const calculateRecurringTotal = () => {
    return selectedProducts
      .filter((p) => p.product.is_recurring)
      .reduce((sum, p) => sum + p.unit_price * p.quantity - p.discount_amount, 0);
  };

  const hasRecurringProducts = selectedProducts.some((p) => p.product.is_recurring);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit(
        {
          title: formData.title,
          description: formData.description || null,
          lead_id: lead?.id,
          expected_close_date: formData.expected_close_date || null,
          payment_terms: formData.payment_terms || null,
          probability: parseInt(formData.probability),
          notes: formData.notes || null,
        },
        selectedProducts
      );
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Nova Proposta {lead ? `para ${lead.company_name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Monte uma proposta customizada com os produtos/serviços
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações básicas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Título da Proposta *</Label>
                <Input
                  id="title"
                  required
                  placeholder="Ex: Proposta Marketing + Automação"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="expected_close_date">Previsão de Fechamento</Label>
                <Input
                  id="expected_close_date"
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) =>
                    setFormData({ ...formData, expected_close_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                rows={2}
                placeholder="Contexto da proposta..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Seleção de produtos */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Produtos/Serviços</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProductSelector(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Produto
                </Button>
              </div>

              {selectedProducts.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum produto adicionado ainda</p>
                    <p className="text-xs mt-1">Clique em "Adicionar Produto" acima</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {selectedProducts.map((item, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 grid grid-cols-4 gap-4">
                            {/* Produto */}
                            <div className="col-span-2">
                              <p className="font-medium">{item.product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.product.description}
                              </p>
                              <div className="flex gap-1 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {getCategoryLabel(item.product.category)}
                                </Badge>
                                {item.product.is_recurring && (
                                  <Badge variant="secondary" className="text-xs">
                                    Recorrente
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Quantidade */}
                            <div>
                              <Label className="text-xs">Qtd</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(index, e.target.value)}
                                className="h-9"
                              />
                            </div>

                            {/* Preço unitário */}
                            <div>
                              <Label className="text-xs">Preço Unit.</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updatePrice(index, e.target.value)}
                                className="h-9"
                                disabled={!item.product.allow_custom_pricing}
                              />
                              {item.product.allow_custom_pricing && item.product.min_price && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Mín: {formatCurrency(Number(item.product.min_price))}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex flex-col items-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProduct(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>

                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">
                                {formatCurrency(item.unit_price * item.quantity - item.discount_amount)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Desconto */}
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`discount-${index}`}
                              checked={item.hasDiscount}
                              onCheckedChange={(checked) => toggleDiscount(index, checked as boolean)}
                            />
                            <Label htmlFor={`discount-${index}`} className="text-sm font-normal">
                              Aplicar desconto
                            </Label>
                          </div>

                          {item.hasDiscount && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div>
                                <Label className="text-xs">Desconto (%)</Label>
                                <Input
                                  type="number"
                                  max={isAdmin ? 100 : (Number(item.product.max_discount_percent) || 100)}
                                  value={item.discount_percent.toFixed(2)}
                                  onChange={(e) => updateDiscountPercent(index, e.target.value)}
                                  className="h-8"
                                />
                                {!isAdmin && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Máx: {item.product.max_discount_percent || 20}%
                                  </p>
                                )}
                              </div>
                              <div>
                                <Label className="text-xs">ou Valor (R$)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.discount_amount.toFixed(2)}
                                  onChange={(e) => updateDiscountAmount(index, e.target.value)}
                                  className="h-8"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Resumo da proposta */}
            {selectedProducts.length > 0 && (
              <Card className="bg-gradient-to-br from-primary/10 to-accent/10">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Resumo da Proposta</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                    </div>

                    {calculateTotalDiscount() > 0 && (
                      <div className="flex justify-between text-sm text-destructive">
                        <span>Desconto:</span>
                        <span>- {formatCurrency(calculateTotalDiscount())}</span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(calculateTotal())}
                      </span>
                    </div>

                    {hasRecurringProducts && (
                      <>
                        <Separator />
                        <div className="space-y-2 pt-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Setup (uma vez):</span>
                            <span className="font-medium">
                              {formatCurrency(calculateSetupTotal())}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Mensalidade:</span>
                            <span className="font-medium">
                              {formatCurrency(calculateRecurringTotal())}/mês
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Condições */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment_terms">Forma de Pagamento</Label>
                <Select
                  value={formData.payment_terms}
                  onValueChange={(value) => setFormData({ ...formData, payment_terms: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="card">Cartão de Crédito</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                    <SelectItem value="installments">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="probability">Probabilidade de Fechar (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Observações Internas</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Notas sobre esta proposta (não visível para o cliente)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || selectedProducts.length === 0}
                className="bg-gradient-to-r from-primary to-accent"
              >
                {loading ? "Salvando..." : "Criar Proposta"}
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
