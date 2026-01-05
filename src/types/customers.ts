import { Tables } from "@/integrations/supabase/types";

export type Customer = Tables<"customers">;
export type Contract = Tables<"contracts">;
export type ContractTemplate = Tables<"contract_templates">;
export type ContractHistory = Tables<"contract_history">;

export interface CustomerWithDetails extends Customer {
  account_manager_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  lead?: {
    id: string;
    company_name: string;
  } | null;
  deal?: {
    id: string;
    deal_number: string;
    total_value: number;
  } | null;
  contracts?: ContractWithDetails[];
}

export interface ContractWithDetails extends Contract {
  customer?: Customer;
  template?: ContractTemplate;
}

export type CustomerStatus = "active" | "inactive" | "suspended" | "cancelled";
export type ContractStatus = "draft" | "sent" | "pending_signature" | "signed" | "active" | "suspended" | "cancelled" | "expired";
