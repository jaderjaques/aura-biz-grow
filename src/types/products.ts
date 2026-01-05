import { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type Deal = Tables<"deals">;
export type DealProduct = Tables<"deal_products">;
export type Quote = Tables<"quotes">;

export interface ProductWithDetails extends Product {}

export interface DealWithDetails extends Deal {
  lead?: {
    id: string;
    company_name: string;
    trading_name: string | null;
    cnpj: string | null;
    segment: string | null;
    contact_name: string | null;
    position: string | null;
    phone: string;
    email: string | null;
  } | null;
  assigned_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  deal_products?: DealProductWithProduct[];
}

export interface DealProductWithProduct extends DealProduct {
  product: Product;
}

export interface QuoteWithDeal extends Quote {
  deal?: DealWithDetails;
}

export interface SelectedProduct {
  product: Product;
  quantity: number;
  unit_price: number;
  hasDiscount: boolean;
  discount_percent: number;
  discount_amount: number;
}
