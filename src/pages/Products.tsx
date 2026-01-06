import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Package, RefreshCw, DollarSign, Megaphone, Bot } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/products/ProductCard";
import { NewProductDialog } from "@/components/products/NewProductDialog";
import { Product } from "@/types/products";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function Products() {
  const { isAdmin } = useAuth();
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

  // Apenas admins podem acessar esta página
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

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
    await createProduct({
      ...product,
      name: `${product.name} (cópia)`,
      sku: null,
    });
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      setEditingProduct(null);
    }
    setShowNewDialog(open);
  };

  const filterProducts = (category?: string) => {
    let filtered = products;
    
    // Filtro por categoria
    if (category && category !== "all") {
      filtered = filtered.filter((p) => p.category === category);
    }
    
    // Filtro por busca
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

  const recurringCount = products.filter((p) => p.is_recurring).length;
  const totalRecurringValue = products
    .filter((p) => p.is_recurring && p.active)
    .reduce((sum, p) => sum + Number(p.base_price), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Produtos</h1>
            <p className="text-muted-foreground">Gerencie o catálogo de produtos e serviços</p>
          </div>
          <Button
            onClick={() => setShowNewDialog(true)}
            className="bg-gradient-to-r from-primary to-accent"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{products.length}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Serviços Recorrentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{recurringCount}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Marketing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-purple-500" />
                <span className="text-2xl font-bold">{getCategoryCount("marketing")}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Automação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{getCategoryCount("automation")}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Todos ({filterProducts("all").length})</TabsTrigger>
            <TabsTrigger value="marketing">
              Marketing ({getCategoryCount("marketing")})
            </TabsTrigger>
            <TabsTrigger value="automation">
              Automação ({getCategoryCount("automation")})
            </TabsTrigger>
            <TabsTrigger value="consulting">
              Consultorias ({getCategoryCount("consulting")})
            </TabsTrigger>
            <TabsTrigger value="addon">Add-ons ({getCategoryCount("addon")})</TabsTrigger>
          </TabsList>

          {["all", "marketing", "automation", "consulting", "addon"].map((cat) => (
            <TabsContent key={cat} value={cat} className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando produtos...
                </div>
              ) : filterProducts(cat).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterProducts(cat).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
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
      />
    </AppLayout>
  );
}
