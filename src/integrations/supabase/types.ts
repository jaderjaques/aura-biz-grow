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
          activity_date: string | null
          activity_type: string
          attachments: Json | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          deal_id: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          lead_id: string | null
          next_action: string | null
          next_action_date: string | null
          outcome: string | null
          scheduled_at: string | null
          task_id: string | null
          title: string
        }
        Insert: {
          activity_date?: string | null
          activity_type: string
          attachments?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          next_action?: string | null
          next_action_date?: string | null
          outcome?: string | null
          scheduled_at?: string | null
          task_id?: string | null
          title: string
        }
        Update: {
          activity_date?: string | null
          activity_type?: string
          attachments?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          next_action?: string | null
          next_action_date?: string | null
          outcome?: string | null
          scheduled_at?: string | null
          task_id?: string | null
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
            foreignKeyName: "activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          active: boolean | null
          api_key: string
          api_key_hash: string | null
          api_key_prefix: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          key_name: string
          last_used_at: string | null
          rate_limit_requests_per_minute: number | null
          scopes: string[] | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          api_key: string
          api_key_hash?: string | null
          api_key_prefix?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key_name: string
          last_used_at?: string | null
          rate_limit_requests_per_minute?: number | null
          scopes?: string[] | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          api_key?: string
          api_key_hash?: string | null
          api_key_prefix?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key_name?: string
          last_used_at?: string | null
          rate_limit_requests_per_minute?: number | null
          scopes?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          description: string | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          severity: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          severity?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          severity?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_configs: {
        Row: {
          action_config: Json | null
          action_type: string
          active: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          failed_executions: number | null
          id: string
          last_execution_at: string | null
          name: string
          successful_executions: number | null
          total_executions: number | null
          trigger_conditions: Json | null
          trigger_event: string
          updated_at: string | null
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          failed_executions?: number | null
          id?: string
          last_execution_at?: string | null
          name: string
          successful_executions?: number | null
          total_executions?: number | null
          trigger_conditions?: Json | null
          trigger_event: string
          updated_at?: string | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          failed_executions?: number | null
          id?: string
          last_execution_at?: string | null
          name?: string
          successful_executions?: number | null
          total_executions?: number | null
          trigger_conditions?: Json | null
          trigger_event?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          active: boolean | null
          bank_name: string | null
          created_at: string | null
          current_balance: number | null
          id: string
          initial_balance: number | null
          name: string
        }
        Insert: {
          account_number?: string | null
          active?: boolean | null
          bank_name?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          initial_balance?: number | null
          name: string
        }
        Update: {
          account_number?: string | null
          active?: boolean | null
          bank_name?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          initial_balance?: number | null
          name?: string
        }
        Relationships: []
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
      cash_transactions: {
        Row: {
          amount: number
          attachments: Json | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          description: string
          expense_category_id: string | null
          id: string
          invoice_id: string | null
          is_recurring: boolean | null
          notes: string | null
          parent_transaction_id: string | null
          payment_method: string | null
          recurrence_frequency: string | null
          revenue_category_id: string | null
          tags: string[] | null
          transaction_date: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          description: string
          expense_category_id?: string | null
          id?: string
          invoice_id?: string | null
          is_recurring?: boolean | null
          notes?: string | null
          parent_transaction_id?: string | null
          payment_method?: string | null
          recurrence_frequency?: string | null
          revenue_category_id?: string | null
          tags?: string[] | null
          transaction_date: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          description?: string
          expense_category_id?: string | null
          id?: string
          invoice_id?: string | null
          is_recurring?: boolean | null
          notes?: string | null
          parent_transaction_id?: string | null
          payment_method?: string | null
          recurrence_frequency?: string | null
          revenue_category_id?: string | null
          tags?: string[] | null
          transaction_date?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_expense_category_id_fkey"
            columns: ["expense_category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "cash_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_revenue_category_id_fkey"
            columns: ["revenue_category_id"]
            isOneToOne: false
            referencedRelation: "revenue_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      change_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      custom_field_values: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          field_id: string | null
          field_value: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          field_id?: string | null
          field_value?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          field_id?: string | null
          field_value?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          applies_to: string
          created_at: string | null
          display_order: number | null
          field_label: string
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
        }
        Insert: {
          applies_to?: string
          created_at?: string | null
          display_order?: number | null
          field_label: string
          field_name: string
          field_options?: Json | null
          field_type: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
        }
        Update: {
          applies_to?: string
          created_at?: string | null
          display_order?: number | null
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
        }
        Relationships: []
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
      dashboard_widgets: {
        Row: {
          active: boolean | null
          config: Json
          created_at: string | null
          dashboard_name: string | null
          height: number
          id: string
          position_x: number
          position_y: number
          title: string
          updated_at: string | null
          user_id: string | null
          widget_type: string
          width: number
        }
        Insert: {
          active?: boolean | null
          config: Json
          created_at?: string | null
          dashboard_name?: string | null
          height?: number
          id?: string
          position_x?: number
          position_y?: number
          title: string
          updated_at?: string | null
          user_id?: string | null
          widget_type: string
          width?: number
        }
        Update: {
          active?: boolean | null
          config?: Json
          created_at?: string | null
          dashboard_name?: string | null
          height?: number
          id?: string
          position_x?: number
          position_y?: number
          title?: string
          updated_at?: string | null
          user_id?: string | null
          widget_type?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      expense_categories: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      export_logs: {
        Row: {
          created_at: string | null
          export_type: string
          file_size_bytes: number | null
          file_url: string | null
          filters: Json | null
          id: string
          report_type: string | null
          rows_exported: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          export_type: string
          file_size_bytes?: number | null
          file_url?: string | null
          filters?: Json | null
          id?: string
          report_type?: string | null
          rows_exported?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          export_type?: string
          file_size_bytes?: number | null
          file_url?: string | null
          filters?: Json | null
          id?: string
          report_type?: string | null
          rows_exported?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      financial_goals: {
        Row: {
          created_at: string | null
          created_by: string | null
          current_value: number | null
          description: string | null
          goal_type: string
          id: string
          period_end: string
          period_start: string
          target_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          goal_type: string
          id?: string
          period_end: string
          period_start: string
          target_value: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          goal_type?: string
          id?: string
          period_end?: string
          period_start?: string
          target_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          action: string
          created_at: string | null
          error_message: string | null
          id: string
          integration_type: string
          ip_address: string | null
          request_data: Json | null
          response_data: Json | null
          response_status: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_type: string
          ip_address?: string | null
          request_data?: Json | null
          response_data?: Json | null
          response_status?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_type?: string
          ip_address?: string | null
          request_data?: Json | null
          response_data?: Json | null
          response_status?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          active: boolean | null
          config: Json
          created_at: string | null
          id: string
          integration_name: string
          last_test_at: string | null
          last_test_success: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          config: Json
          created_at?: string | null
          id?: string
          integration_name: string
          last_test_at?: string | null
          last_test_success?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          config?: Json
          created_at?: string | null
          id?: string
          integration_name?: string
          last_test_at?: string | null
          last_test_success?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_history: {
        Row: {
          action: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
        }
        Insert: {
          action: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
        }
        Update: {
          action?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
          payment_proof_url: string | null
          pdf_url: string | null
          pix_code: string | null
          pix_qrcode_url: string | null
          recurrence_id: string | null
          sent_at: string | null
          status: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          viewed_at: string | null
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
          payment_proof_url?: string | null
          pdf_url?: string | null
          pix_code?: string | null
          pix_qrcode_url?: string | null
          recurrence_id?: string | null
          sent_at?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          viewed_at?: string | null
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
          payment_proof_url?: string | null
          pdf_url?: string | null
          pix_code?: string | null
          pix_qrcode_url?: string | null
          recurrence_id?: string | null
          sent_at?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          viewed_at?: string | null
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
      knowledge_base: {
        Row: {
          active: boolean | null
          category_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          helpful_count: number | null
          id: string
          public: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          helpful_count?: number | null
          id?: string
          public?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          helpful_count?: number | null
          id?: string
          public?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_qualification_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          field_changed: string
          id: string
          lead_id: string | null
          new_value: string | null
          notes: string | null
          old_value: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          field_changed: string
          id?: string
          lead_id?: string | null
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          field_changed?: string
          id?: string
          lead_id?: string | null
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_qualification_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_score_history: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string | null
          new_grade: string | null
          new_score: number | null
          old_grade: string | null
          old_score: number | null
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          new_grade?: string | null
          new_score?: number | null
          old_grade?: string | null
          old_score?: number | null
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          new_grade?: string | null
          new_score?: number | null
          old_grade?: string | null
          old_score?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_score_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scoring_rules: {
        Row: {
          condition_field: string
          condition_operator: string
          condition_value: string
          created_at: string | null
          id: string
          is_active: boolean | null
          points: number
          rule_category: string
          rule_name: string
          updated_at: string | null
        }
        Insert: {
          condition_field: string
          condition_operator: string
          condition_value: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          points: number
          rule_category: string
          rule_name: string
          updated_at?: string | null
        }
        Update: {
          condition_field?: string
          condition_operator?: string
          condition_value?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          points?: number
          rule_category?: string
          rule_name?: string
          updated_at?: string | null
        }
        Relationships: []
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
          bant_authority: string | null
          bant_authority_notes: string | null
          bant_budget: string | null
          bant_budget_notes: string | null
          bant_budget_value: number | null
          bant_need: string | null
          bant_need_description: string | null
          bant_qualified: boolean | null
          bant_qualified_at: string | null
          bant_qualified_by: string | null
          bant_score: number | null
          bant_timeline: string | null
          bant_timeline_date: string | null
          bant_timeline_notes: string | null
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
          last_score_update: string | null
          lead_score: number | null
          needs: string | null
          notes: string | null
          phone: string
          position: string | null
          probability: number | null
          score_grade: string | null
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
          bant_authority?: string | null
          bant_authority_notes?: string | null
          bant_budget?: string | null
          bant_budget_notes?: string | null
          bant_budget_value?: number | null
          bant_need?: string | null
          bant_need_description?: string | null
          bant_qualified?: boolean | null
          bant_qualified_at?: string | null
          bant_qualified_by?: string | null
          bant_score?: number | null
          bant_timeline?: string | null
          bant_timeline_date?: string | null
          bant_timeline_notes?: string | null
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
          last_score_update?: string | null
          lead_score?: number | null
          needs?: string | null
          notes?: string | null
          phone: string
          position?: string | null
          probability?: number | null
          score_grade?: string | null
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
          bant_authority?: string | null
          bant_authority_notes?: string | null
          bant_budget?: string | null
          bant_budget_notes?: string | null
          bant_budget_value?: number | null
          bant_need?: string | null
          bant_need_description?: string | null
          bant_qualified?: boolean | null
          bant_qualified_at?: string | null
          bant_qualified_by?: string | null
          bant_score?: number | null
          bant_timeline?: string | null
          bant_timeline_date?: string | null
          bant_timeline_notes?: string | null
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
          last_score_update?: string | null
          lead_score?: number | null
          needs?: string | null
          notes?: string | null
          phone?: string
          position?: string | null
          probability?: number | null
          score_grade?: string | null
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
      message_templates: {
        Row: {
          active: boolean | null
          body: string
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          preview_text: string | null
          subject: string | null
          template_type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          body: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          preview_text?: string | null
          subject?: string | null
          template_type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          body?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          preview_text?: string | null
          subject?: string | null
          template_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_snapshots: {
        Row: {
          arr: number | null
          average_cac: number | null
          average_completion_time_hours: number | null
          average_deal_value: number | null
          average_ltv: number | null
          average_resolution_time_hours: number | null
          churn_mrr: number | null
          churned_customers: number | null
          conversion_rate: number | null
          created_at: string | null
          customer_churn_rate: number | null
          customer_satisfaction_avg: number | null
          deals_lost: number | null
          deals_won: number | null
          expansion_mrr: number | null
          id: string
          leads_converted: number | null
          ltv_cac_ratio: number | null
          mrr: number | null
          new_customers: number | null
          new_mrr: number | null
          qualified_leads: number | null
          sla_compliance_rate: number | null
          snapshot_date: string
          tasks_completed: number | null
          tasks_overdue: number | null
          tickets_created: number | null
          tickets_resolved: number | null
          total_customers: number | null
          total_deals: number | null
          total_leads: number | null
          total_pipeline_value: number | null
          total_revenue: number | null
          win_rate: number | null
        }
        Insert: {
          arr?: number | null
          average_cac?: number | null
          average_completion_time_hours?: number | null
          average_deal_value?: number | null
          average_ltv?: number | null
          average_resolution_time_hours?: number | null
          churn_mrr?: number | null
          churned_customers?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          customer_churn_rate?: number | null
          customer_satisfaction_avg?: number | null
          deals_lost?: number | null
          deals_won?: number | null
          expansion_mrr?: number | null
          id?: string
          leads_converted?: number | null
          ltv_cac_ratio?: number | null
          mrr?: number | null
          new_customers?: number | null
          new_mrr?: number | null
          qualified_leads?: number | null
          sla_compliance_rate?: number | null
          snapshot_date: string
          tasks_completed?: number | null
          tasks_overdue?: number | null
          tickets_created?: number | null
          tickets_resolved?: number | null
          total_customers?: number | null
          total_deals?: number | null
          total_leads?: number | null
          total_pipeline_value?: number | null
          total_revenue?: number | null
          win_rate?: number | null
        }
        Update: {
          arr?: number | null
          average_cac?: number | null
          average_completion_time_hours?: number | null
          average_deal_value?: number | null
          average_ltv?: number | null
          average_resolution_time_hours?: number | null
          churn_mrr?: number | null
          churned_customers?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          customer_churn_rate?: number | null
          customer_satisfaction_avg?: number | null
          deals_lost?: number | null
          deals_won?: number | null
          expansion_mrr?: number | null
          id?: string
          leads_converted?: number | null
          ltv_cac_ratio?: number | null
          mrr?: number | null
          new_customers?: number | null
          new_mrr?: number | null
          qualified_leads?: number | null
          sla_compliance_rate?: number | null
          snapshot_date?: string
          tasks_completed?: number | null
          tasks_overdue?: number | null
          tickets_created?: number | null
          tickets_resolved?: number | null
          total_customers?: number | null
          total_deals?: number | null
          total_leads?: number | null
          total_pipeline_value?: number | null
          total_revenue?: number | null
          win_rate?: number | null
        }
        Relationships: []
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
      permissions: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
          backup_codes: string[] | null
          created_at: string | null
          email: string
          failed_login_attempts: number | null
          full_name: string
          id: string
          invite_accepted_at: string | null
          invite_expires_at: string | null
          invite_sent_at: string | null
          invite_token: string | null
          invited_by: string | null
          is_active: boolean | null
          last_login_at: string | null
          locked_until: string | null
          password_changed_at: string | null
          phone: string | null
          role_id: string | null
          security_questions: Json | null
          status: string | null
          totp_enabled: boolean | null
          totp_secret: string | null
          totp_verified_at: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          avatar_url?: string | null
          backup_codes?: string[] | null
          created_at?: string | null
          email: string
          failed_login_attempts?: number | null
          full_name: string
          id: string
          invite_accepted_at?: string | null
          invite_expires_at?: string | null
          invite_sent_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_login_at?: string | null
          locked_until?: string | null
          password_changed_at?: string | null
          phone?: string | null
          role_id?: string | null
          security_questions?: Json | null
          status?: string | null
          totp_enabled?: boolean | null
          totp_secret?: string | null
          totp_verified_at?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          avatar_url?: string | null
          backup_codes?: string[] | null
          created_at?: string | null
          email?: string
          failed_login_attempts?: number | null
          full_name?: string
          id?: string
          invite_accepted_at?: string | null
          invite_expires_at?: string | null
          invite_sent_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_login_at?: string | null
          locked_until?: string | null
          password_changed_at?: string | null
          phone?: string | null
          role_id?: string | null
          security_questions?: Json | null
          status?: string | null
          totp_enabled?: boolean | null
          totp_secret?: string | null
          totp_verified_at?: string | null
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
      quick_replies: {
        Row: {
          active: boolean | null
          category_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          shortcut: string | null
          title: string
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          shortcut?: string | null
          title: string
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          shortcut?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_replies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      revenue_categories: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string | null
          role_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          role_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
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
      saved_reports: {
        Row: {
          config: Json
          created_at: string | null
          description: string | null
          id: string
          is_favorite: boolean | null
          last_generated_at: string | null
          name: string
          report_type: string
          schedule_config: Json | null
          schedule_frequency: string | null
          schedule_recipients: string[] | null
          scheduled: boolean | null
          shared_with_team: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          config: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          last_generated_at?: string | null
          name: string
          report_type: string
          schedule_config?: Json | null
          schedule_frequency?: string | null
          schedule_recipients?: string[] | null
          scheduled?: boolean | null
          shared_with_team?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          last_generated_at?: string | null
          name?: string
          report_type?: string
          schedule_config?: Json | null
          schedule_frequency?: string | null
          schedule_recipients?: string[] | null
          scheduled?: boolean | null
          shared_with_team?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_segments: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          filters: Json
          id: string
          is_favorite: boolean | null
          name: string
          shared_with_team: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters: Json
          id?: string
          is_favorite?: boolean | null
          name: string
          shared_with_team?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters?: Json
          id?: string
          is_favorite?: boolean | null
          name?: string
          shared_with_team?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_configs: {
        Row: {
          category_id: string | null
          created_at: string | null
          first_response_hours: number
          id: string
          priority: string
          resolution_hours: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          first_response_hours: number
          id?: string
          priority: string
          resolution_hours: number
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          first_response_hours?: number
          id?: string
          priority?: string
          resolution_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "sla_configs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
        ]
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
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          comment: string
          created_at: string | null
          created_by: string | null
          id: string
          mentions: string[] | null
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          comment: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          mentions?: string[] | null
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          comment?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          mentions?: string[] | null
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          default_assigned_to: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          name: string
          priority: string | null
          recurrence_config: Json | null
          recurrence_pattern: string
          task_type: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          default_assigned_to?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name: string
          priority?: string | null
          recurrence_config?: Json | null
          recurrence_pattern: string
          task_type?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          default_assigned_to?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name?: string
          priority?: string | null
          recurrence_config?: Json | null
          recurrence_pattern?: string
          task_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_default_assigned_to_fkey"
            columns: ["default_assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          checklist: Json | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          deal_id: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          is_recurring: boolean | null
          kanban_order: number | null
          lead_id: string | null
          parent_task_id: string | null
          priority: string | null
          recurrence_config: Json | null
          recurrence_pattern: string | null
          reminder_enabled: boolean | null
          reminder_minutes_before: number | null
          reminder_sent: boolean | null
          status: string | null
          tags: string[] | null
          task_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          checklist?: Json | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_recurring?: boolean | null
          kanban_order?: number | null
          lead_id?: string | null
          parent_task_id?: string | null
          priority?: string | null
          recurrence_config?: Json | null
          recurrence_pattern?: string | null
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          reminder_sent?: boolean | null
          status?: string | null
          tags?: string[] | null
          task_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          checklist?: Json | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_recurring?: boolean | null
          kanban_order?: number | null
          lead_id?: string | null
          parent_task_id?: string | null
          priority?: string | null
          recurrence_config?: Json | null
          recurrence_pattern?: string | null
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          reminder_sent?: boolean | null
          status?: string | null
          tags?: string[] | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_categories: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          sla_first_response_hours: number | null
          sla_resolution_hours: number | null
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          sla_first_response_hours?: number | null
          sla_resolution_hours?: number | null
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          sla_first_response_hours?: number | null
          sla_resolution_hours?: number | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_customer: boolean | null
          is_internal: boolean | null
          message: string
          ticket_id: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_customer?: boolean | null
          is_internal?: boolean | null
          message: string
          ticket_id?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_customer?: boolean | null
          is_internal?: boolean | null
          message?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category_id: string | null
          closed_at: string | null
          created_at: string | null
          created_by: string | null
          customer_feedback: string | null
          customer_id: string | null
          customer_rating: number | null
          description: string
          first_response_at: string | null
          id: string
          kanban_order: number | null
          priority: string | null
          resolved_at: string | null
          sla_first_response_deadline: string | null
          sla_first_response_violated: boolean | null
          sla_resolution_deadline: string | null
          sla_resolution_violated: boolean | null
          status: string | null
          subject: string
          ticket_number: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_feedback?: string | null
          customer_id?: string | null
          customer_rating?: number | null
          description: string
          first_response_at?: string | null
          id?: string
          kanban_order?: number | null
          priority?: string | null
          resolved_at?: string | null
          sla_first_response_deadline?: string | null
          sla_first_response_violated?: boolean | null
          sla_resolution_deadline?: string | null
          sla_resolution_violated?: boolean | null
          status?: string | null
          subject: string
          ticket_number?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_feedback?: string | null
          customer_id?: string | null
          customer_rating?: number | null
          description?: string
          first_response_at?: string | null
          id?: string
          kanban_order?: number | null
          priority?: string | null
          resolved_at?: string | null
          sla_first_response_deadline?: string | null
          sla_first_response_violated?: boolean | null
          sla_resolution_deadline?: string | null
          sla_resolution_violated?: boolean | null
          status?: string | null
          subject?: string
          ticket_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          active: boolean | null
          browser: string | null
          device_type: string | null
          ended_at: string | null
          id: string
          ip_address: string | null
          last_activity_at: string | null
          os: string | null
          session_token: string
          started_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          browser?: string | null
          device_type?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          last_activity_at?: string | null
          os?: string | null
          session_token: string
          started_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          browser?: string | null
          device_type?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          last_activity_at?: string | null
          os?: string | null
          session_token?: string
          started_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          attempt_number: number | null
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          request_body: Json | null
          request_headers: Json | null
          request_url: string | null
          response_body: string | null
          response_status: number | null
          response_time_ms: number | null
          success: boolean | null
          webhook_id: string | null
        }
        Insert: {
          attempt_number?: number | null
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          request_body?: Json | null
          request_headers?: Json | null
          request_url?: string | null
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          success?: boolean | null
          webhook_id?: string | null
        }
        Update: {
          attempt_number?: number | null
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          request_body?: Json | null
          request_headers?: Json | null
          request_url?: string | null
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          success?: boolean | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          active: boolean | null
          auth_config: Json | null
          auth_type: string | null
          created_at: string | null
          custom_headers: Json | null
          events: string[]
          failed_deliveries: number | null
          id: string
          last_delivery_at: string | null
          last_delivery_status: string | null
          name: string
          retry_enabled: boolean | null
          retry_max_attempts: number | null
          successful_deliveries: number | null
          total_deliveries: number | null
          updated_at: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          auth_config?: Json | null
          auth_type?: string | null
          created_at?: string | null
          custom_headers?: Json | null
          events: string[]
          failed_deliveries?: number | null
          id?: string
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          name: string
          retry_enabled?: boolean | null
          retry_max_attempts?: number | null
          successful_deliveries?: number | null
          total_deliveries?: number | null
          updated_at?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          auth_config?: Json | null
          auth_type?: string | null
          created_at?: string | null
          custom_headers?: Json | null
          events?: string[]
          failed_deliveries?: number | null
          id?: string
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          name?: string
          retry_enabled?: boolean | null
          retry_max_attempts?: number | null
          successful_deliveries?: number | null
          total_deliveries?: number | null
          updated_at?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      calculate_balance: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          net_balance: number
          total_expenses: number
          total_revenue: number
        }[]
      }
      calculate_bant_score: { Args: { p_lead_id: string }; Returns: number }
      calculate_lead_score: {
        Args: { lead_record: Database["public"]["Tables"]["leads"]["Row"] }
        Returns: number
      }
      calculate_lead_score_rules: {
        Args: { p_lead_id: string }
        Returns: number
      }
      disable_totp_2fa: { Args: { p_user_id: string }; Returns: boolean }
      enable_totp_2fa: {
        Args: { p_secret: string; p_user_id: string }
        Returns: boolean
      }
      generate_api_key: { Args: never; Returns: string }
      generate_contract_number: { Args: never; Returns: string }
      generate_deal_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_quote_number: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
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
      get_own_totp_secret: {
        Args: never
        Returns: {
          totp_secret: string
        }[]
      }
      get_totp_secret_for_login: {
        Args: { p_user_id: string }
        Returns: {
          backup_codes: string[]
          totp_secret: string
        }[]
      }
      has_permission: {
        Args: { p_permission_name: string; p_user_id: string }
        Returns: boolean
      }
      hash_api_key: { Args: { key_value: string }; Returns: string }
      increment_failed_login: { Args: { p_user_id: string }; Returns: number }
      is_account_locked: { Args: { p_user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_changes?: Json
          p_description?: string
          p_ip_address?: string
          p_resource_id?: string
          p_resource_type: string
          p_severity?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      log_security_event:
        | {
            Args: {
              p_details?: Json
              p_event_type: string
              p_severity?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_details?: Json
              p_event_type: string
              p_ip_address?: string
              p_severity?: string
              p_user_agent?: string
              p_user_id: string
            }
            Returns: string
          }
      reset_failed_login: { Args: { p_user_id: string }; Returns: undefined }
      save_backup_codes: {
        Args: { p_codes: string[]; p_user_id: string }
        Returns: boolean
      }
      search_leads_by_tags: {
        Args: { p_operator?: string; p_tag_ids: string[] }
        Returns: {
          lead_id: string
        }[]
      }
      update_lead_score_with_history: {
        Args: { p_lead_id: string }
        Returns: undefined
      }
      use_backup_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
      validate_api_key: {
        Args: { key_value: string }
        Returns: {
          active: boolean
          expires_at: string
          id: string
          key_name: string
          scopes: string[]
          user_id: string
        }[]
      }
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
