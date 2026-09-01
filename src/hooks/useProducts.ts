import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/types/products";
import { getCurrentProfile } from "@/lib/tenant-utils";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast({
        title: "Erro ao carregar catálogo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const createProduct = async (productData: Partial<Product>) => {
    try {
      const profile = await getCurrentProfile();
      const { data, error } = await supabase
        .from("products")
        .insert({
          ...productData,
          created_by: profile.id,
          tenant_id: profile.tenant_id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Criado!",
        description: `${data.name} foi adicionado ao catálogo`,
      });

      await fetchProducts();
      return data;
    } catch (error: any) {
      console.error("Error creating product:", error);
      toast({
        title: "Erro ao criar",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Atualizado!",
        description: `${data.name} foi atualizado`,
      });

      await fetchProducts();
      return data;
    } catch (error: any) {
      console.error("Error updating product:", error);
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const toggleProductActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ active })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: active ? "Ativado!" : "Desativado!",
      });

      await fetchProducts();
    } catch (error: any) {
      console.error("Error toggling product:", error);
      toast({
        title: "Erro ao alterar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Excluído!",
      });

      await fetchProducts();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getActiveProducts = () => products.filter((p) => p.active);
  
  const getProductsByCategory = (category: string) => 
    products.filter((p) => p.category === category);

  const getCategoryCount = (category: string) =>
    products.filter((p) => p.category === category).length;

  return {
    products,
    loading,
    fetchProducts,
    createProduct,
    updateProduct,
    toggleProductActive,
    deleteProduct,
    getActiveProducts,
    getProductsByCategory,
    getCategoryCount,
  };
}
