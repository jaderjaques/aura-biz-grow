export interface TicketCategory {
  id: string;
  name: string;
  description: string | null;
  sla_first_response_hours: number;
  sla_resolution_hours: number;
  color: string;
  active: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  customer_id: string | null;
  subject: string;
  description: string;
  category_id: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  sla_first_response_deadline: string | null;
  sla_resolution_deadline: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  sla_first_response_violated: boolean;
  sla_resolution_violated: boolean;
  customer_rating: number | null;
  customer_feedback: string | null;
  kanban_order: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  // Relations
  category?: TicketCategory;
  customer?: {
    id: string;
    company_name: string;
    contact_name: string;
  };
  assigned_user?: {
    id: string;
    full_name: string;
  };
  messages_count?: number;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  message: string;
  is_internal: boolean;
  is_customer: boolean;
  created_by: string | null;
  attachments: any;
  created_at: string;
  created_by_user?: {
    id: string;
    full_name: string;
  };
}

export interface QuickReply {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  shortcut: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  public: boolean;
  views_count: number;
  helpful_count: number;
  tags: string[] | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: TicketCategory;
}

export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed' | 'cancelled';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
