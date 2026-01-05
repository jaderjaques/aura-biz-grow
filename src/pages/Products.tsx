import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/products/ProductCard";
import { NewProductDialog } from "@/components/products/NewProductDialog";
import { Product } from "@/types/products";

export default function Products() {
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
    if (!category || category === "all") return products;
    return products.filter((p) => p.category === category);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Produtos e Serviços</h1>
            <p className="text-muted-foreground">Gerencie seu catálogo</p>
          </div>
          <Button
            onClick={() => setShowNewDialog(true)}
            className="bg-gradient-to-r from-primary to-accent"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Todos ({products.length})</TabsTrigger>
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
