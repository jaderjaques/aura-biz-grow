import { Product } from "@/types/products";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Copy, EyeOff, Eye, Tag, Settings, TrendingUp, Megaphone, Bot, Users, Puzzle, Package } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onToggleActive: (id: string, active: boolean) => void;
}

export function ProductCard({ product, onEdit, onDuplicate, onToggleActive }: ProductCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "marketing":
        return <Megaphone className="h-3 w-3" />;
      case "automation":
        return <Bot className="h-3 w-3" />;
      case "consulting":
        return <Users className="h-3 w-3" />;
      case "addon":
        return <Puzzle className="h-3 w-3" />;
      default:
        return null;
    }
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
    <Card className={`hover:shadow-lg transition-shadow ${!product.active ? "opacity-60" : ""}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex gap-3 items-start">
            <div className="w-10 h-10 rounded-md border border-border overflow-hidden shrink-0 flex items-center justify-center bg-muted/50">
              {(product as any).image_url ? (
                <img src={(product as any).image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="h-5 w-5 text-muted-foreground/50" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{product.name}</CardTitle>
              <CardDescription className="mt-1">
                {product.description}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(product)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onToggleActive(product.id, !product.active)}>
                {product.active ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Desativar
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Ativar
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Badges de categoria e tipo */}
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1">
            {getCategoryIcon(product.category)}
            {getCategoryLabel(product.category)}
          </Badge>
          <Badge variant="secondary">
            {getTypeLabel(product.type)}
          </Badge>
          {!product.active && (
            <Badge variant="destructive">Inativo</Badge>
          )}
        </div>

        {/* Preço */}
        <div>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(Number(product.base_price))}
          </p>
          {product.is_recurring && (
            <p className="text-xs text-muted-foreground">
              por {product.billing_cycle === "monthly" ? "mês" : "ano"}
            </p>
          )}
        </div>

        {/* Informações extras */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {product.allow_custom_pricing && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              <span>Preço negociável</span>
            </div>
          )}
          {product.requires_setup && (
            <div className="flex items-center gap-1">
              <Settings className="h-3 w-3" />
              <span>Requer setup</span>
            </div>
          )}
          {product.available_for_upsell && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>Upsell</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
