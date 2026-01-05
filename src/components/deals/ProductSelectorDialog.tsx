import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { Product } from "@/types/products";
import { useProducts } from "@/hooks/useProducts";

interface ProductSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (product: Product) => void;
}

export function ProductSelectorDialog({
  open,
  onOpenChange,
  onSelect,
}: ProductSelectorDialogProps) {
  const { products, getActiveProducts } = useProducts();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");

  const activeProducts = getActiveProducts();

  const filteredProducts = activeProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === "all" || product.category === category;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "marketing":
        return "Marketing";
      case "automation":
        return "Automação";
      case "consulting":
        return "Consultoria";
      case "addon":
        return "Add-on";
      default:
        return cat;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "setup":
        return "Setup";
      case "monthly":
        return "Mensal";
      case "one_time":
        return "Único";
      case "hourly":
        return "Por hora";
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Selecionar Produtos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtro por categoria */}
          <Tabs defaultValue="all" onValueChange={setCategory}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
              <TabsTrigger value="automation">Automação</TabsTrigger>
              <TabsTrigger value="consulting">Consultorias</TabsTrigger>
              <TabsTrigger value="addon">Add-ons</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Lista de produtos */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum produto encontrado
              </div>
            ) : (
              filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => onSelect(product)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {product.description}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {getCategoryLabel(product.category)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {getTypeLabel(product.type)}
                          </Badge>
                          {product.is_recurring && (
                            <Badge className="text-xs bg-green-600">Recorrente</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(Number(product.base_price))}
                        </p>
                        {product.is_recurring && (
                          <p className="text-xs text-muted-foreground">
                            /{product.billing_cycle === "monthly" ? "mês" : "ano"}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
