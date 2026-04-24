import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Package, RefreshCw, Megaphone, Bot,
         ShieldCheck, Sparkles, GitMerge, Anchor, Scissors,
         Leaf, Activity, Layers, Baby, MoreHorizontal, Stethoscope } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/products/ProductCard";
import { NewProductDialog } from "@/components/products/NewProductDialog";
import { Product } from "@/types/products";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useTenantModule } from "@/hooks/useTenantModule";
import { getModuleProductConfig } from "@/config/moduleProductConfig";

// Mapa de ícones por nome
const ICON_MAP: Record<string, React.ElementType> = {
  Package, RefreshCw, Megaphone, Bot,
  ShieldCheck, Sparkles, GitMerge, Anchor, Scissors,
  Leaf, Activity, Layers, Baby, MoreHorizontal, Stethoscope,
};

export default function Products() {
  const { isAdmin } = useAuth();
  const { module } = useTenantModule();
  const cfg = getModuleProductConfig(module);

  const {
    products,
    loading,
    createProduct,
    updateProduct,
    toggleProductActive,
    getCategoryCount,
  } = useProducts();

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (data: Partial<Product>) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, data);
    } else {
      await createProduct(data);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowNewDialog(true);
  };

  const handleDuplicate = async (product: Product) => {
    await createProduct({ ...product, name: `${product.name} (cópia)`, sku: null });
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open) setEditingProduct(null);
    setShowNewDialog(open);
  };

  const filterProducts = (category?: string) => {
    let filtered = products;
    if (category && category !== "all") {
      filtered = filtered.filter((p) => p.category === category);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
      );
    }
    return filtered;
  };

  const getStatValue = (key: string) => {
    if (key === "total") return products.length;
    if (key === "recurring") return products.filter((p) => p.is_recurring).length;
    return getCategoryCount(key);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{cfg.pageTitle}</h1>
            <p className="text-muted-foreground">{cfg.pageSubtitle}</p>
          </div>
          <Button
            onClick={() => setShowNewDialog(true)}
            className="bg-gradient-to-r from-primary to-accent"
          >
            <Plus className="mr-2 h-4 w-4" />
            {cfg.newButtonLabel}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {cfg.statsCards.map((stat) => {
            const Icon = ICON_MAP[stat.icon] ?? Package;
            return (
              <Card key={stat.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                    <span className="text-2xl font-bold">{getStatValue(stat.key)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Buscar ${cfg.pageTitle.toLowerCase()}...`}
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs por categoria */}
        <Tabs defaultValue="all">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Todos ({filterProducts("all").length})
            </TabsTrigger>
            {cfg.categories.map((cat) => (
              <TabsTrigger
                key={cat.value}
                value={cat.value}
                className="data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                {cat.label} ({getCategoryCount(cat.value)})
              </TabsTrigger>
            ))}
          </TabsList>

          {["all", ...cfg.categories.map((c) => c.value)].map((cat) => (
            <TabsContent key={cat} value={cat} className="space-y-4 mt-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando...
                </div>
              ) : filterProducts(cat).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum {cfg.pageTitle === "Procedimentos" ? "procedimento" : "produto"} encontrado
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterProducts(cat).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      config={cfg}
                      onEdit={handleEdit}
                      onDuplicate={handleDuplicate}
                      onToggleActive={toggleProductActive}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <NewProductDialog
        open={showNewDialog}
        onOpenChange={handleCloseDialog}
        onSubmit={handleSubmit}
        editingProduct={editingProduct}
        config={cfg}
      />
    </AppLayout>
  );
}
