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
  customer?: {
    id: string;
    company_name: string;
    trading_name: string | null;
    cnpj: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  assigned_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  deal_products?: DealProductWithProduct[];
}

/** Retorna o nome de exibição da empresa vinculada ao deal (customer ou lead) */
export function getDealClientName(deal: DealWithDetails): string {
  if (deal.customer?.company_name) return deal.customer.company_name;
  if (deal.lead?.company_name) return deal.lead.company_name;
  return "-";
}

/** Retorna o nome do contato vinculado ao deal */
export function getDealContactName(deal: DealWithDetails): string | null {
  if (deal.customer) return deal.customer.trading_name || null;
  if (deal.lead) return deal.lead.contact_name || null;
  return null;
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

/** Retorna o valor real de um deal — usa total_value do banco ou calcula dos deal_products como fallback */
export function getDealTotal(deal: DealWithDetails): number {
  const stored = Number(deal.total_value);
  if (stored > 0) return stored;
  return (deal.deal_products || []).reduce(
    (sum, dp) => sum + Number(dp.unit_price) * Number(dp.quantity) - Number(dp.discount_amount || 0),
    0
  );
}

export function getDealRecurring(deal: DealWithDetails): number {
  const stored = Number(deal.recurring_value);
  if (stored > 0) return stored;
  return (deal.deal_products || [])
    .filter((dp) => dp.product?.is_recurring)
    .reduce((sum, dp) => sum + Number(dp.unit_price) * Number(dp.quantity) - Number(dp.discount_amount || 0), 0);
}
