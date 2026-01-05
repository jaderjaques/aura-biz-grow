-- 1. Add columns to permissions table if it doesn't exist, create it
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create role_permissions junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- 3. Insert granular permissions organized by category
INSERT INTO permissions (name, description, category) VALUES
  -- Dashboard
  ('dashboard:view', 'Visualizar dashboard principal', 'dashboard'),
  ('dashboard:view_all_metrics', 'Ver métricas de toda equipe', 'dashboard'),
  
  -- Leads
  ('leads:view_own', 'Ver próprios leads', 'leads'),
  ('leads:view_all', 'Ver todos os leads', 'leads'),
  ('leads:create', 'Criar novos leads', 'leads'),
  ('leads:edit_own', 'Editar próprios leads', 'leads'),
  ('leads:edit_all', 'Editar todos os leads', 'leads'),
  ('leads:delete', 'Deletar leads', 'leads'),
  ('leads:assign', 'Atribuir leads a outros usuários', 'leads'),
  ('leads:import', 'Importar leads em massa', 'leads'),
  ('leads:export', 'Exportar leads', 'leads'),
  
  -- Propostas/Deals
  ('deals:view_own', 'Ver próprias propostas', 'deals'),
  ('deals:view_all', 'Ver todas as propostas', 'deals'),
  ('deals:create', 'Criar propostas', 'deals'),
  ('deals:edit_own', 'Editar próprias propostas', 'deals'),
  ('deals:edit_all', 'Editar todas as propostas', 'deals'),
  ('deals:delete', 'Deletar propostas', 'deals'),
  ('deals:approve', 'Aprovar descontos especiais', 'deals'),
  
  -- Produtos
  ('products:view', 'Ver catálogo de produtos', 'products'),
  ('products:create', 'Criar produtos', 'products'),
  ('products:edit', 'Editar produtos', 'products'),
  ('products:delete', 'Deletar produtos', 'products'),
  ('products:manage_pricing', 'Gerenciar precificação', 'products'),
  
  -- Clientes
  ('customers:view_own', 'Ver próprios clientes', 'customers'),
  ('customers:view_all', 'Ver todos os clientes', 'customers'),
  ('customers:edit_own', 'Editar próprios clientes', 'customers'),
  ('customers:edit_all', 'Editar todos os clientes', 'customers'),
  ('customers:delete', 'Deletar clientes', 'customers'),
  
  -- Contratos
  ('contracts:view_own', 'Ver próprios contratos', 'contracts'),
  ('contracts:view_all', 'Ver todos os contratos', 'contracts'),
  ('contracts:create', 'Criar contratos', 'contracts'),
  ('contracts:edit', 'Editar contratos', 'contracts'),
  ('contracts:delete', 'Deletar contratos', 'contracts'),
  ('contracts:sign', 'Registrar assinaturas', 'contracts'),
  
  -- Financeiro
  ('financial:view_dashboard', 'Ver dashboard financeiro', 'financial'),
  ('financial:view_all_invoices', 'Ver todas as faturas', 'financial'),
  ('financial:create_invoices', 'Criar faturas', 'financial'),
  ('financial:edit_invoices', 'Editar faturas', 'financial'),
  ('financial:delete_invoices', 'Deletar faturas', 'financial'),
  ('financial:mark_paid', 'Marcar como pago', 'financial'),
  ('financial:apply_discounts', 'Aplicar descontos', 'financial'),
  ('financial:view_reports', 'Ver relatórios financeiros', 'financial'),
  
  -- Tarefas
  ('tasks:view_own', 'Ver próprias tarefas', 'tasks'),
  ('tasks:view_all', 'Ver todas as tarefas', 'tasks'),
  ('tasks:create', 'Criar tarefas', 'tasks'),
  ('tasks:edit_own', 'Editar próprias tarefas', 'tasks'),
  ('tasks:edit_all', 'Editar todas as tarefas', 'tasks'),
  ('tasks:delete', 'Deletar tarefas', 'tasks'),
  ('tasks:assign', 'Atribuir tarefas', 'tasks'),
  
  -- Tickets/Suporte
  ('tickets:view_own', 'Ver próprios tickets', 'tickets'),
  ('tickets:view_all', 'Ver todos os tickets', 'tickets'),
  ('tickets:create', 'Criar tickets', 'tickets'),
  ('tickets:edit', 'Editar tickets', 'tickets'),
  ('tickets:delete', 'Deletar tickets', 'tickets'),
  ('tickets:resolve', 'Resolver tickets', 'tickets'),
  ('tickets:manage_kb', 'Gerenciar base de conhecimento', 'tickets'),
  
  -- Relatórios
  ('reports:view_basic', 'Ver relatórios básicos', 'reports'),
  ('reports:view_advanced', 'Ver relatórios avançados', 'reports'),
  ('reports:create_custom', 'Criar relatórios customizados', 'reports'),
  ('reports:schedule', 'Agendar relatórios', 'reports'),
  ('reports:export', 'Exportar relatórios', 'reports'),
  
  -- Integrações/Automação
  ('integrations:view', 'Ver integrações', 'integrations'),
  ('integrations:manage', 'Gerenciar integrações', 'integrations'),
  ('integrations:create_api_keys', 'Criar API keys', 'integrations'),
  ('integrations:manage_webhooks', 'Gerenciar webhooks', 'integrations'),
  
  -- Configurações
  ('settings:view', 'Ver configurações', 'settings'),
  ('settings:manage_users', 'Gerenciar usuários', 'settings'),
  ('settings:manage_roles', 'Gerenciar roles e permissões', 'settings'),
  ('settings:manage_company', 'Gerenciar dados da empresa', 'settings'),
  ('settings:view_audit_logs', 'Ver logs de auditoria', 'settings'),
  ('settings:manage_integrations', 'Configurar integrações', 'settings')
ON CONFLICT (name) DO NOTHING;

-- 4. Assign all permissions to Administrador role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administrador'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. Assign basic permissions to Funcionário role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'dashboard:view',
  'leads:view_own', 'leads:create', 'leads:edit_own', 'leads:export',
  'deals:view_own', 'deals:create', 'deals:edit_own',
  'products:view',
  'customers:view_own', 'customers:edit_own',
  'contracts:view_own',
  'tasks:view_own', 'tasks:create', 'tasks:edit_own',
  'tickets:view_own', 'tickets:create',
  'reports:view_basic', 'reports:export'
)
WHERE r.name = 'Funcionário'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 6. Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  user_email TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  description TEXT,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create change_history table
CREATE TABLE change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create user_sessions table
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true
);

-- 9. Enable RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies
CREATE POLICY "Everyone view permissions" ON permissions FOR SELECT USING (true);

CREATE POLICY "Admins manage role_permissions" ON role_permissions FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Everyone view role_permissions" ON role_permissions FOR SELECT USING (true);

CREATE POLICY "Admins view audit logs" ON audit_logs FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "System insert audit logs" ON audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins view change history" ON change_history FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "System insert change history" ON change_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users view own sessions" ON user_sessions FOR SELECT 
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- 11. Indexes
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity) WHERE severity IN ('warning', 'critical');
CREATE INDEX idx_change_history_record ON change_history(table_name, record_id);
CREATE INDEX idx_change_history_changed ON change_history(changed_at DESC);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id) WHERE active = true;

-- 12. Function to check user permission
CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles u
    JOIN role_permissions rp ON rp.role_id = u.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = p_user_id
    AND p.name = p_permission_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;