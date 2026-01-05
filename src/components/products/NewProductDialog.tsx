import { useState, useEffect } from "react";
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
import { Product } from "@/types/products";

interface NewProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Product>) => Promise<void>;
  editingProduct?: Product | null;
}

export function NewProductDialog({
  open,
  onOpenChange,
  onSubmit,
  editingProduct,
}: NewProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    type: "",
    base_price: "",
    max_discount_percent: "20",
    allow_custom_pricing: false,
    min_price: "",
    is_recurring: false,
    billing_cycle: "",
    requires_setup: false,
    available_for_upsell: false,
  });

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name,
        description: editingProduct.description || "",
        category: editingProduct.category,
        type: editingProduct.type,
        base_price: String(editingProduct.base_price),
        max_discount_percent: String(editingProduct.max_discount_percent || 20),
        allow_custom_pricing: editingProduct.allow_custom_pricing || false,
        min_price: editingProduct.min_price ? String(editingProduct.min_price) : "",
        is_recurring: editingProduct.is_recurring || false,
        billing_cycle: editingProduct.billing_cycle || "",
        requires_setup: editingProduct.requires_setup || false,
        available_for_upsell: editingProduct.available_for_upsell || false,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        category: "",
        type: "",
        base_price: "",
        max_discount_percent: "20",
        allow_custom_pricing: false,
        min_price: "",
        is_recurring: false,
        billing_cycle: "",
        requires_setup: false,
        available_for_upsell: false,
      });
    }
  }, [editingProduct, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        type: formData.type,
        base_price: parseFloat(formData.base_price),
        max_discount_percent: parseFloat(formData.max_discount_percent),
        allow_custom_pricing: formData.allow_custom_pricing,
        min_price: formData.min_price ? parseFloat(formData.min_price) : null,
        is_recurring: formData.is_recurring,
        billing_cycle: formData.is_recurring ? formData.billing_cycle : null,
        requires_setup: formData.requires_setup,
        available_for_upsell: formData.available_for_upsell,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? "Editar Produto" : "Novo Produto/Serviço"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Básico */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                required
                placeholder="Ex: Setup Marketing Digital"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Descreva o produto/serviço..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">Marketing Digital</SelectItem>
                    <SelectItem value="automation">Automação</SelectItem>
                    <SelectItem value="consulting">Consultorias</SelectItem>
                    <SelectItem value="addon">Add-ons/Integrações</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="setup">Setup (uma vez)</SelectItem>
                    <SelectItem value="monthly">Mensalidade</SelectItem>
                    <SelectItem value="one_time">Pagamento único</SelectItem>
                    <SelectItem value="hourly">Por hora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Precificação */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Precificação</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="base_price">Preço Base (R$) *</Label>
                <Input
                  id="base_price"
                  type="number"
                  step="0.01"
                  required
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="max_discount">Desconto Máximo (%)</Label>
                <Input
                  id="max_discount"
                  type="number"
                  max="100"
                  value={formData.max_discount_percent}
                  onChange={(e) =>
                    setFormData({ ...formData, max_discount_percent: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allow_custom_pricing"
                checked={formData.allow_custom_pricing}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allow_custom_pricing: checked as boolean })
                }
              />
              <Label htmlFor="allow_custom_pricing" className="font-normal">
                Permitir precificação customizada (negociável)
              </Label>
            </div>

            {formData.allow_custom_pricing && (
              <div>
                <Label htmlFor="min_price">Preço Mínimo (R$)</Label>
                <Input
                  id="min_price"
                  type="number"
                  step="0.01"
                  value={formData.min_price}
                  onChange={(e) => setFormData({ ...formData, min_price: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Recorrência */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_recurring: checked as boolean })
                }
              />
              <Label htmlFor="is_recurring" className="font-normal">
                Serviço recorrente (cobrança mensal/anual)
              </Label>
            </div>

            {formData.is_recurring && (
              <div>
                <Label htmlFor="billing_cycle">Ciclo de Cobrança *</Label>
                <Select
                  value={formData.billing_cycle}
                  onValueChange={(value) => setFormData({ ...formData, billing_cycle: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Opções */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requires_setup"
                checked={formData.requires_setup}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requires_setup: checked as boolean })
                }
              />
              <Label htmlFor="requires_setup" className="font-normal">
                Requer setup antes de ativar
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="available_for_upsell"
                checked={formData.available_for_upsell}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, available_for_upsell: checked as boolean })
                }
              />
              <Label htmlFor="available_for_upsell" className="font-normal">
                Disponível para upsell (oferecer para clientes ativos)
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
              className="bg-gradient-to-r from-primary to-accent"
            >
              {loading ? "Salvando..." : editingProduct ? "Salvar" : "Criar Produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
