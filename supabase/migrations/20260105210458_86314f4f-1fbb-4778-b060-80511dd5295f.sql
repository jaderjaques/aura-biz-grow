-- 1. API Keys por usuário
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['leads:read', 'leads:write'],
  rate_limit_requests_per_minute INT DEFAULT 100,
  active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Webhooks configuráveis
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  auth_type TEXT DEFAULT 'none',
  auth_config JSONB,
  custom_headers JSONB,
  retry_enabled BOOLEAN DEFAULT true,
  retry_max_attempts INT DEFAULT 3,
  active BOOLEAN DEFAULT true,
  total_deliveries INT DEFAULT 0,
  successful_deliveries INT DEFAULT 0,
  failed_deliveries INT DEFAULT 0,
  last_delivery_at TIMESTAMPTZ,
  last_delivery_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Log de webhooks
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  request_url TEXT,
  request_headers JSONB,
  request_body JSONB,
  response_status INT,
  response_body TEXT,
  response_time_ms INT,
  attempt_number INT DEFAULT 1,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Templates de mensagens
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  preview_text TEXT,
  category TEXT,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Logs de integrações
CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type TEXT NOT NULL,
  action TEXT NOT NULL,
  request_data JSONB,
  response_status TEXT,
  response_data JSONB,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  user_id UUID REFERENCES profiles(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Configurações de automação
CREATE TABLE automation_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  trigger_conditions JSONB,
  action_type TEXT NOT NULL,
  action_config JSONB,
  active BOOLEAN DEFAULT true,
  total_executions INT DEFAULT 0,
  successful_executions INT DEFAULT 0,
  failed_executions INT DEFAULT 0,
  last_execution_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Configurações de integração externa
CREATE TABLE integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name TEXT UNIQUE NOT NULL,
  config JSONB NOT NULL,
  active BOOLEAN DEFAULT false,
  last_test_at TIMESTAMPTZ,
  last_test_success BOOLEAN,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir templates padrão
INSERT INTO message_templates (name, description, template_type, subject, body, category) VALUES
  (
    'Bem-vindo Cliente',
    'Mensagem de boas-vindas para novos clientes',
    'email',
    'Bem-vindo à Responde uAI, {{company_name}}!',
    'Olá {{contact_name}},

É um prazer tê-lo como cliente da Responde uAI!

Estamos empolgados em trabalhar com {{company_name}} e ajudá-los a alcançar seus objetivos de marketing digital.

Seu account manager {{user_name}} entrará em contato em breve para agendar nossa primeira reunião.

Atenciosamente,
Equipe Responde uAI',
    'welcome'
  ),
  (
    'Lembrete Fatura',
    'Lembrete de fatura próxima do vencimento',
    'email',
    'Lembrete: Fatura {{invoice_number}} vence em breve',
    'Olá {{contact_name}},

Este é um lembrete amigável de que a fatura {{invoice_number}} no valor de {{invoice_amount}} vence em {{due_date}}.

Para evitar interrupções no serviço, por favor efetue o pagamento até a data de vencimento.

Dúvidas? Estamos à disposição!

Atenciosamente,
Equipe Responde uAI',
    'reminder'
  ),
  (
    'Follow-up Lead',
    'Primeira mensagem de follow-up para leads',
    'whatsapp',
    NULL,
    'Olá {{contact_name}}!

Sou {{user_name}} da Responde uAI. Vi que você demonstrou interesse em nossos serviços de marketing digital.

Podemos conversar sobre como podemos ajudar {{company_name}}?

Quando seria um bom momento para uma call rápida?',
    'follow_up'
  );

-- 8. RLS Policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

-- API Keys policies
CREATE POLICY "Users view own api keys"
  ON api_keys FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users manage own api keys"
  ON api_keys FOR ALL
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Webhooks policies
CREATE POLICY "Users view own webhooks"
  ON webhooks FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users manage own webhooks"
  ON webhooks FOR ALL
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Webhook logs policies
CREATE POLICY "Users view own webhook logs"
  ON webhook_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM webhooks 
      WHERE webhooks.id = webhook_logs.webhook_id 
      AND (webhooks.user_id = auth.uid() OR is_admin(auth.uid()))
    )
  );

-- Templates policies
CREATE POLICY "Users view templates"
  ON message_templates FOR SELECT
  USING (active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage templates"
  ON message_templates FOR ALL
  USING (is_admin(auth.uid()));

-- Integration logs policies
CREATE POLICY "Users view integration logs"
  ON integration_logs FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users insert integration logs"
  ON integration_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Automation configs policies
CREATE POLICY "Admins manage automation configs"
  ON automation_configs FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Users view automation configs"
  ON automation_configs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Integration settings policies
CREATE POLICY "Admins manage integration settings"
  ON integration_settings FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins view integration settings"
  ON integration_settings FOR SELECT
  USING (is_admin(auth.uid()));

-- 9. Índices
CREATE INDEX idx_api_keys_user ON api_keys(user_id) WHERE active = true;
CREATE INDEX idx_api_keys_key ON api_keys(api_key) WHERE active = true;
CREATE INDEX idx_webhooks_user ON webhooks(user_id) WHERE active = true;
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);
CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);
CREATE INDEX idx_integration_logs_type ON integration_logs(integration_type);
CREATE INDEX idx_integration_logs_created ON integration_logs(created_at DESC);
CREATE INDEX idx_automation_configs_trigger ON automation_configs(trigger_event) WHERE active = true;

-- 10. Triggers
CREATE TRIGGER webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER message_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER automation_configs_updated_at
  BEFORE UPDATE ON automation_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER integration_settings_updated_at
  BEFORE UPDATE ON integration_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 11. Função para gerar API Key
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
BEGIN
  RETURN 'rua_' || encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SET search_path = public;