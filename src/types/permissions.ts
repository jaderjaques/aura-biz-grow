import { Tables } from "@/integrations/supabase/types";

export type Permission = Tables<"permissions">;
export type RolePermission = Tables<"role_permissions">;
export type AuditLog = Tables<"audit_logs">;
export type ChangeHistory = Tables<"change_history">;
export type UserSession = Tables<"user_sessions">;

export interface RoleWithDetails {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean | null;
  users_count: number;
  permissions_count: number;
  created_at: string | null;
}

export interface PermissionsByCategory {
  [category: string]: Permission[];
}

export const CATEGORY_LABELS: Record<string, string> = {
  agenda: 'Agenda',
  dashboard: 'Dashboard',
  leads: 'Leads',
  deals: 'Propostas',
  products: 'Produtos',
  customers: 'Clientes',
  contracts: 'Contratos',
  financial: 'Financeiro',
  tasks: 'Tarefas',
  tickets: 'Suporte',
  reports: 'Relatórios',
  integrations: 'Integrações',
  settings: 'Configurações'
};

export const CATEGORY_ICONS: Record<string, string> = {
  dashboard: 'LayoutDashboard',
  leads: 'Users',
  deals: 'FileText',
  products: 'Package',
  customers: 'Building',
  contracts: 'FileSignature',
  financial: 'DollarSign',
  tasks: 'ClipboardList',
  tickets: 'Headphones',
  reports: 'BarChart3',
  integrations: 'Zap',
  settings: 'Settings'
};

export const ACTION_LABELS: Record<string, string> = {
  create: 'Criar',
  update: 'Atualizar',
  delete: 'Deletar',
  view: 'Visualizar',
  export: 'Exportar',
  login: 'Login',
  logout: 'Logout',
  failed_login: 'Login Falhou'
};

export const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  info: { label: 'Info', color: 'text-blue-500' },
  warning: { label: 'Aviso', color: 'text-amber-500' },
  critical: { label: 'Crítico', color: 'text-red-500' }
};
