export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          lead_id: string | null
          scheduled_at: string | null
          title: string
        }
        Insert: {
          activity_type: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          scheduled_at?: string | null
          title: string
        }
        Update: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          scheduled_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_settings: {
        Row: {
          billing_contact_name: string | null
          billing_email: string | null
          billing_phone: string | null
          created_at: string | null
          customer_id: string | null
          grace_period_days: number | null
          id: string
          notes: string | null
          payment_day: number | null
          preferred_payment_method: string | null
          send_overdue_notification: boolean | null
          send_reminder_days_before: number | null
          updated_at: string | null
        }
        Insert: {
          billing_contact_name?: string | null
          billing_email?: string | null
          billing_phone?: string | null
          created_at?: string | null
          customer_id?: string | null
          grace_period_days?: number | null
          id?: string
          notes?: string | null
          payment_day?: number | null
          preferred_payment_method?: string | null
          send_overdue_notification?: boolean | null
          send_reminder_days_before?: number | null
          updated_at?: string | null
        }
        Update: {
          billing_contact_name?: string | null
          billing_email?: string | null
          billing_phone?: string | null
          created_at?: string | null
          customer_id?: string | null
          grace_period_days?: number | null
          id?: string
          notes?: string | null
          payment_day?: number | null
          preferred_payment_method?: string | null
          send_overdue_notification?: boolean | null
          send_reminder_days_before?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_history: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          contract_id: string | null
          details: Json | null
          from_status: string | null
          id: string
          notes: string | null
          to_status: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          contract_id?: string | null
          details?: Json | null
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          contract_id?: string | null
          details?: Json | null
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          active: boolean | null
          content: string
          contract_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          content: string
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          content?: string
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          auto_renew: boolean | null
          billing_cycle: string | null
          cancellation_date: string | null
          cancellation_reason: string | null
          cancellation_requested_by: string | null
          contract_html: string | null
          contract_number: string
          contract_pdf_url: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          deal_id: string | null
          end_date: string | null
          id: string
          next_renewal_date: string | null
          notes: string | null
          payment_day: number | null
          payment_method: string | null
          products: Json | null
          recurring_value: number | null
          renewal_alert_sent: boolean | null
          renewal_notice_days: number | null
          setup_value: number | null
          signature_data: Json | null
          signature_type: string | null
          signed_by_customer_cpf: string | null
          signed_by_customer_name: string | null
          signed_date: string | null
          start_date: string
          status: string | null
          template_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          billing_cycle?: string | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          cancellation_requested_by?: string | null
          contract_html?: string | null
          contract_number: string
          contract_pdf_url?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          end_date?: string | null
          id?: string
          next_renewal_date?: string | null
          notes?: string | null
          payment_day?: number | null
          payment_method?: string | null
          products?: Json | null
          recurring_value?: number | null
          renewal_alert_sent?: boolean | null
          renewal_notice_days?: number | null
          setup_value?: number | null
          signature_data?: Json | null
          signature_type?: string | null
          signed_by_customer_cpf?: string | null
          signed_by_customer_name?: string | null
          signed_date?: string | null
          start_date: string
          status?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          billing_cycle?: string | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          cancellation_requested_by?: string | null
          contract_html?: string | null
          contract_number?: string
          contract_pdf_url?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          end_date?: string | null
          id?: string
          next_renewal_date?: string | null
          notes?: string | null
          payment_day?: number | null
          payment_method?: string | null
          products?: Json | null
          recurring_value?: number | null
          renewal_alert_sent?: boolean | null
          renewal_notice_days?: number | null
          setup_value?: number | null
          signature_data?: Json | null
          signature_type?: string | null
          signed_by_customer_cpf?: string | null
          signed_by_customer_name?: string | null
          signed_date?: string | null
          start_date?: string
          status?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_cancellation_requested_by_fkey"
            columns: ["cancellation_requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          account_manager: string | null
          city: string | null
          cnpj: string | null
          company_name: string
          company_size: string | null
          complement: string | null
          contact_name: string
          cpf: string | null
          created_at: string | null
          created_by: string | null
          current_tools: Json | null
          customer_since: string | null
          deal_id: string | null
          email: string
          employee_count: number | null
          facebook: string | null
          foundation_year: number | null
          id: string
          instagram: string | null
          lead_id: string | null
          lifetime_value: number | null
          linkedin: string | null
          monthly_value: number | null
          municipal_registration: string | null
          neighborhood: string | null
          notes: string | null
          number: string | null
          phone: string
          portal_enabled: boolean | null
          portal_user_id: string | null
          position: string | null
          revenue_range: string | null
          segment: string | null
          state: string | null
          state_registration: string | null
          status: string | null
          street: string | null
          trading_name: string | null
          updated_at: string | null
          uses_instagram_business: boolean | null
          uses_whatsapp_business: boolean | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          account_manager?: string | null
          city?: string | null
          cnpj?: string | null
          company_name: string
          company_size?: string | null
          complement?: string | null
          contact_name: string
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          current_tools?: Json | null
          customer_since?: string | null
          deal_id?: string | null
          email: string
          employee_count?: number | null
          facebook?: string | null
          foundation_year?: number | null
          id?: string
          instagram?: string | null
          lead_id?: string | null
          lifetime_value?: number | null
          linkedin?: string | null
          monthly_value?: number | null
          municipal_registration?: string | null
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone: string
          portal_enabled?: boolean | null
          portal_user_id?: string | null
          position?: string | null
          revenue_range?: string | null
          segment?: string | null
          state?: string | null
          state_registration?: string | null
          status?: string | null
          street?: string | null
          trading_name?: string | null
          updated_at?: string | null
          uses_instagram_business?: boolean | null
          uses_whatsapp_business?: boolean | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          account_manager?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string
          company_size?: string | null
          complement?: string | null
          contact_name?: string
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          current_tools?: Json | null
          customer_since?: string | null
          deal_id?: string | null
          email?: string
          employee_count?: number | null
          facebook?: string | null
          foundation_year?: number | null
          id?: string
          instagram?: string | null
          lead_id?: string | null
          lifetime_value?: number | null
          linkedin?: string | null
          monthly_value?: number | null
          municipal_registration?: string | null
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string
          portal_enabled?: boolean | null
          portal_user_id?: string | null
          position?: string | null
          revenue_range?: string | null
          segment?: string | null
          state?: string | null
          state_registration?: string | null
          status?: string | null
          street?: string | null
          trading_name?: string | null
          updated_at?: string | null
          uses_instagram_business?: boolean | null
          uses_whatsapp_business?: boolean | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_account_manager_fkey"
            columns: ["account_manager"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_products: {
        Row: {
          complexity_selected: Json | null
          created_at: string | null
          deal_id: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number | null
          start_date: string | null
          subtotal: number | null
          total: number | null
          unit_price: number
        }
        Insert: {
          complexity_selected?: Json | null
          created_at?: string | null
          deal_id?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          start_date?: string | null
          subtotal?: number | null
          total?: number | null
          unit_price: number
        }
        Update: {
          complexity_selected?: Json | null
          created_at?: string | null
          deal_id?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number | null
          start_date?: string | null
          subtotal?: number | null
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_products_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          actual_close_date: string | null
          assigned_to: string | null
          closed_at: string | null
          created_at: string | null
          created_by: string | null
          deal_number: string | null
          description: string | null
          discount_total: number | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          lost_reason: string | null
          notes: string | null
          payment_terms: string | null
          probability: number | null
          recurring_value: number | null
          setup_value: number | null
          stage: string | null
          status: string | null
          title: string
          total_value: number | null
          updated_at: string | null
        }
        Insert: {
          actual_close_date?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_number?: string | null
          description?: string | null
          discount_total?: number | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          notes?: string | null
          payment_terms?: string | null
          probability?: number | null
          recurring_value?: number | null
          setup_value?: number | null
          stage?: string | null
          status?: string | null
          title: string
          total_value?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_close_date?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_number?: string | null
          description?: string | null
          discount_total?: number | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          notes?: string | null
          payment_terms?: string | null
          probability?: number | null
          recurring_value?: number | null
          setup_value?: number | null
          stage?: string | null
          status?: string | null
          title?: string
          total_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_alerts: {
        Row: {
          action_notes: string | null
          action_required: boolean | null
          action_taken: boolean | null
          action_taken_at: string | null
          action_taken_by: string | null
          alert_date: string | null
          alert_type: string
          created_at: string | null
          customer_id: string | null
          id: string
          message: string
          notification_channel: string | null
          notified: boolean | null
          notified_at: string | null
          related_id: string | null
          related_type: string | null
          severity: string | null
        }
        Insert: {
          action_notes?: string | null
          action_required?: boolean | null
          action_taken?: boolean | null
          action_taken_at?: string | null
          action_taken_by?: string | null
          alert_date?: string | null
          alert_type: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          message: string
          notification_channel?: string | null
          notified?: boolean | null
          notified_at?: string | null
          related_id?: string | null
          related_type?: string | null
          severity?: string | null
        }
        Update: {
          action_notes?: string | null
          action_required?: boolean | null
          action_taken?: boolean | null
          action_taken_at?: string | null
          action_taken_by?: string | null
          alert_date?: string | null
          alert_type?: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          message?: string
          notification_channel?: string | null
          notified?: boolean | null
          notified_at?: string | null
          related_id?: string | null
          related_type?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_alerts_action_taken_by_fkey"
            columns: ["action_taken_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          from_status: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          to_status: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          from_status?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          to_status?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          from_status?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_status_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          boleto_barcode: string | null
          boleto_url: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          description: string | null
          discount_amount: number | null
          due_date: string
          id: string
          internal_notes: string | null
          invoice_number: string
          invoice_type: string
          is_recurring: boolean | null
          issue_date: string | null
          notes: string | null
          payment_confirmation: string | null
          payment_date: string | null
          payment_method: string | null
          pdf_url: string | null
          pix_code: string | null
          pix_qrcode_url: string | null
          recurrence_id: string | null
          status: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          boleto_barcode?: string | null
          boleto_url?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          discount_amount?: number | null
          due_date: string
          id?: string
          internal_notes?: string | null
          invoice_number: string
          invoice_type: string
          is_recurring?: boolean | null
          issue_date?: string | null
          notes?: string | null
          payment_confirmation?: string | null
          payment_date?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          pix_code?: string | null
          pix_qrcode_url?: string | null
          recurrence_id?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          boleto_barcode?: string | null
          boleto_url?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          discount_amount?: number | null
          due_date?: string
          id?: string
          internal_notes?: string | null
          invoice_number?: string
          invoice_type?: string
          is_recurring?: boolean | null
          issue_date?: string | null
          notes?: string | null
          payment_confirmation?: string | null
          payment_date?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          pix_code?: string | null
          pix_qrcode_url?: string | null
          recurrence_id?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          created_at: string | null
          lead_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          lead_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          cnpj: string | null
          company_name: string
          company_size: string | null
          contact_name: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          email: string | null
          employee_count: number | null
          estimated_value: number | null
          first_contact_at: string | null
          id: string
          instagram: string | null
          last_contact_at: string | null
          lead_score: number | null
          needs: string | null
          notes: string | null
          phone: string
          position: string | null
          probability: number | null
          segment: string | null
          source: string
          source_details: Json | null
          stage: string | null
          status: string | null
          trading_name: string | null
          updated_at: string | null
          viewed_at: string | null
          website: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          cnpj?: string | null
          company_name: string
          company_size?: string | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          employee_count?: number | null
          estimated_value?: number | null
          first_contact_at?: string | null
          id?: string
          instagram?: string | null
          last_contact_at?: string | null
          lead_score?: number | null
          needs?: string | null
          notes?: string | null
          phone: string
          position?: string | null
          probability?: number | null
          segment?: string | null
          source?: string
          source_details?: Json | null
          stage?: string | null
          status?: string | null
          trading_name?: string | null
          updated_at?: string | null
          viewed_at?: string | null
          website?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          cnpj?: string | null
          company_name?: string
          company_size?: string | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          employee_count?: number | null
          estimated_value?: number | null
          first_contact_at?: string | null
          id?: string
          instagram?: string | null
          last_contact_at?: string | null
          lead_score?: number | null
          needs?: string | null
          notes?: string | null
          phone?: string
          position?: string | null
          probability?: number | null
          segment?: string | null
          source?: string
          source_details?: Json | null
          stage?: string | null
          status?: string | null
          trading_name?: string | null
          updated_at?: string | null
          viewed_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_statement_date: string | null
          confirmed_at: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          receipt_url: string | null
          reconciled: boolean | null
          reconciled_at: string | null
          reconciled_by: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          bank_statement_date?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date: string
          payment_method: string
          receipt_url?: string | null
          reconciled?: boolean | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          bank_statement_date?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          receipt_url?: string | null
          reconciled?: boolean | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_closed_lost: boolean | null
          is_closed_won: boolean | null
          name: string
          stage_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_closed_lost?: boolean | null
          is_closed_won?: boolean | null
          name: string
          stage_order: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_closed_lost?: boolean | null
          is_closed_won?: boolean | null
          name?: string
          stage_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          allow_custom_pricing: boolean | null
          available_for_upsell: boolean | null
          base_price: number
          billing_cycle: string | null
          category: string
          complexity_factors: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_recurring: boolean | null
          max_discount_percent: number | null
          min_price: number | null
          name: string
          requires_setup: boolean | null
          sku: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          allow_custom_pricing?: boolean | null
          available_for_upsell?: boolean | null
          base_price: number
          billing_cycle?: string | null
          category: string
          complexity_factors?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          max_discount_percent?: number | null
          min_price?: number | null
          name: string
          requires_setup?: boolean | null
          sku?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          allow_custom_pricing?: boolean | null
          available_for_upsell?: boolean | null
          base_price?: number
          billing_cycle?: string | null
          category?: string
          complexity_factors?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          max_discount_percent?: number | null
          min_price?: number | null
          name?: string
          requires_setup?: boolean | null
          sku?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          api_key: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          invite_accepted_at: string | null
          invite_expires_at: string | null
          invite_sent_at: string | null
          invite_token: string | null
          invited_by: string | null
          is_active: boolean | null
          last_login_at: string | null
          phone: string | null
          role_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          invite_accepted_at?: string | null
          invite_expires_at?: string | null
          invite_sent_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_login_at?: string | null
          phone?: string | null
          role_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          invite_accepted_at?: string | null
          invite_expires_at?: string | null
          invite_sent_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_login_at?: string | null
          phone?: string | null
          role_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          created_by: string | null
          deal_id: string | null
          id: string
          introduction: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          quote_number: string
          rejected_at: string | null
          rejection_reason: string | null
          sent_at: string | null
          status: string | null
          terms_and_conditions: string | null
          title: string
          total_value: number | null
          valid_until: string | null
          version: number | null
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          id?: string
          introduction?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          quote_number: string
          rejected_at?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          status?: string | null
          terms_and_conditions?: string | null
          title: string
          total_value?: number | null
          valid_until?: string | null
          version?: number | null
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          id?: string
          introduction?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          quote_number?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          status?: string | null
          terms_and_conditions?: string | null
          title?: string
          total_value?: number | null
          valid_until?: string | null
          version?: number | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system_role: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name?: string
        }
        Relationships: []
      }
      stage_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          duration_seconds: number | null
          from_stage: string | null
          id: string
          lead_id: string | null
          notes: string | null
          to_stage: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          duration_seconds?: number | null
          from_stage?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          to_stage?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          duration_seconds?: number | null
          from_stage?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          to_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: {
        Args: { auth_user_id: string; token_value: string }
        Returns: boolean
      }
      calculate_lead_score: {
        Args: { lead_record: Database["public"]["Tables"]["leads"]["Row"] }
        Returns: number
      }
      generate_contract_number: { Args: never; Returns: string }
      generate_deal_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_quote_number: { Args: never; Returns: string }
      get_invite_by_token: {
        Args: { token_value: string }
        Returns: {
          email: string
          full_name: string
          id: string
          invite_expires_at: string
          role_name: string
          status: string
        }[]
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "Administrador" | "Funcionário"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["Administrador", "Funcionário"],
    },
  },
} as const
