import { Tables } from "@/integrations/supabase/types";

export type Invoice = Tables<"invoices">;
export type Payment = Tables<"payments">;
export type FinancialAlert = Tables<"financial_alerts">;
export type BillingSettings = Tables<"billing_settings">;
export type InvoiceStatusHistory = Tables<"invoice_status_history">;

export interface InvoiceWithDetails extends Invoice {
  customer?: {
    id: string;
    company_name: string;
    contact_name: string;
    email: string;
  };
  contract?: {
    id: string;
    contract_number: string;
    title: string;
  };
}

export interface PaymentWithDetails extends Payment {
  invoice?: Invoice;
  customer?: {
    id: string;
    company_name: string;
  };
}

export type InvoiceType = "setup" | "monthly" | "addon" | "consulting" | "adjustment";
export type InvoiceStatus = "pending" | "sent" | "paid" | "overdue" | "cancelled" | "refunded";
export type PaymentMethod = "boleto" | "pix" | "card" | "bank_transfer";
export type AlertSeverity = "info" | "warning" | "critical";

export interface FinancialMetrics {
  mrr: number;
  mrrGrowth: number;
  monthlyRevenue: number;
  invoicesPaid: number;
  pendingAmount: number;
  pendingCount: number;
  overdueAmount: number;
  overdueCount: number;
}
