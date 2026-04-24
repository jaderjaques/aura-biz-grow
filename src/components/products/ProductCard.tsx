import { Product } from "@/types/products";
import { ModuleProductConfig } from "@/config/moduleProductConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical, Edit, Copy, EyeOff, Eye, Tag, Settings, TrendingUp,
  Package, ShieldCheck, Sparkles, GitMerge, Anchor, Scissors,
  Leaf, Activity, Layers, Baby, MoreHorizontal, Stethoscope,
  Megaphone, Bot, Users, Puzzle,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  Package, ShieldCheck, Sparkles, GitMerge, Anchor, Scissors,
  Leaf, Activity, Layers, Baby, MoreHorizontal, Stethoscope,
  Megaphone, Bot, Users, Puzzle,
};

interface ProductCardProps {
  product: Product;
  config: ModuleProductConfig;
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onToggleActive: (id: string, active: boolean) => void;
}

export function ProductCard({ product, config, onEdit, onDuplicate, onToggleActive }: ProductCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const catDef = config.categories.find((c) => c.value === product.category);
  const Icon = catDef ? (ICON_MAP[catDef.icon] ?? Package) : Package;
  const catLabel = catDef?.label ?? product.category;
  const catColor = catDef?.color ?? "text-muted-foreground";

  const typeLabel =
    config.types.find((t) => t.value === product.type)?.label ?? product.type;

  return (
    <Card className={`hover:shadow-lg transition-shadow ${!product.active ? "opacity-60" : ""}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex gap-3 items-start">
            <div className="w-10 h-10 rounded-md border border-border overflow-hidden shrink-0 flex items-center justify-center bg-muted/50">
              {(product as any).image_url ? (
                <img src={(product as any).image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Icon className={`h-5 w-5 ${catColor} opacity-60`} />
              )}
            </div>
            <div>
              <CardTitle className="text-base leading-tight">{product.name}</CardTitle>
              {product.description && (
                <CardDescription className="mt-1 text-xs line-clamp-2">
                  {product.description}
                </CardDescription>
              )}
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
                <Edit className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(product)}>
                <Copy className="mr-2 h-4 w-4" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onToggleActive(product.id, !product.active)}>
                {product.active ? (
                  <><EyeOff className="mr-2 h-4 w-4" /> Desativar</>
                ) : (
                  <><Eye className="mr-2 h-4 w-4" /> Ativar</>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Categoria + tipo */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={`gap-1 ${catColor}`}>
            <Icon className="h-3 w-3" />
            {catLabel}
          </Badge>
          <Badge variant="secondary">{typeLabel}</Badge>
          {!product.active && <Badge variant="destructive">Inativo</Badge>}
        </div>

        {/* Preço */}
        <div>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(Number(product.base_price))}
          </p>
          {product.is_recurring && product.billing_cycle && (
            <p className="text-xs text-muted-foreground">
              por {product.billing_cycle === "monthly" ? "mês" : product.billing_cycle === "quarterly" ? "trimestre" : "ano"}
            </p>
          )}
        </div>

        {/* Tags extras */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {product.allow_custom_pricing && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" /> <span>Preço negociável</span>
            </div>
          )}
          {product.requires_setup && (
            <div className="flex items-center gap-1">
              <Settings className="h-3 w-3" /> <span>Requer setup</span>
            </div>
          )}
          {product.available_for_upsell && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> <span>Upsell</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
