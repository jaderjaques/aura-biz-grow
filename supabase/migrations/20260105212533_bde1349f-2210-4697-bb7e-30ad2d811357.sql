-- 1. Relatórios salvos/favoritos
CREATE TABLE saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL,
  config JSONB NOT NULL,
  scheduled BOOLEAN DEFAULT false,
  schedule_frequency TEXT,
  schedule_config JSONB,
  schedule_recipients TEXT[],
  shared_with_team BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Widgets de dashboard
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  title TEXT NOT NULL,
  config JSONB NOT NULL,
  position_x INT NOT NULL DEFAULT 0,
  position_y INT NOT NULL DEFAULT 0,
  width INT NOT NULL DEFAULT 1,
  height INT NOT NULL DEFAULT 1,
  dashboard_name TEXT DEFAULT 'main',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Snapshots de métricas
CREATE TABLE metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  total_leads INT DEFAULT 0,
  qualified_leads INT DEFAULT 0,
  leads_converted INT DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  total_deals INT DEFAULT 0,
  deals_won INT DEFAULT 0,
  deals_lost INT DEFAULT 0,
  win_rate DECIMAL(5,2),
  average_deal_value DECIMAL(10,2),
  total_pipeline_value DECIMAL(10,2),
  mrr DECIMAL(10,2) DEFAULT 0,
  arr DECIMAL(10,2) DEFAULT 0,
  new_mrr DECIMAL(10,2) DEFAULT 0,
  expansion_mrr DECIMAL(10,2) DEFAULT 0,
  churn_mrr DECIMAL(10,2) DEFAULT 0,
  total_customers INT DEFAULT 0,
  new_customers INT DEFAULT 0,
  churned_customers INT DEFAULT 0,
  customer_churn_rate DECIMAL(5,2),
  total_revenue DECIMAL(10,2) DEFAULT 0,
  average_ltv DECIMAL(10,2),
  average_cac DECIMAL(10,2),
  ltv_cac_ratio DECIMAL(5,2),
  tasks_completed INT DEFAULT 0,
  tasks_overdue INT DEFAULT 0,
  average_completion_time_hours DECIMAL(10,2),
  tickets_created INT DEFAULT 0,
  tickets_resolved INT DEFAULT 0,
  average_resolution_time_hours DECIMAL(10,2),
  sla_compliance_rate DECIMAL(5,2),
  customer_satisfaction_avg DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date)
);

-- 4. Logs de exportação
CREATE TABLE export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  export_type TEXT NOT NULL,
  report_type TEXT,
  filters JSONB,
  file_url TEXT,
  file_size_bytes BIGINT,
  rows_exported INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS Policies
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own or shared reports"
  ON saved_reports FOR SELECT
  USING (
    user_id = auth.uid() OR
    shared_with_team = true OR
    is_admin(auth.uid())
  );

CREATE POLICY "Users manage own reports"
  ON saved_reports FOR ALL
  USING (
    user_id = auth.uid() OR
    is_admin(auth.uid())
  );

CREATE POLICY "Users manage own widgets"
  ON dashboard_widgets FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users view metrics"
  ON metrics_snapshots FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users view own exports"
  ON export_logs FOR SELECT
  USING (
    user_id = auth.uid() OR
    is_admin(auth.uid())
  );

CREATE POLICY "Users create exports"
  ON export_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Índices
CREATE INDEX idx_saved_reports_user ON saved_reports(user_id);
CREATE INDEX idx_saved_reports_type ON saved_reports(report_type);
CREATE INDEX idx_saved_reports_favorite ON saved_reports(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_dashboard_widgets_user ON dashboard_widgets(user_id);
CREATE INDEX idx_dashboard_widgets_dashboard ON dashboard_widgets(user_id, dashboard_name) WHERE active = true;
CREATE INDEX idx_metrics_snapshots_date ON metrics_snapshots(snapshot_date DESC);
CREATE INDEX idx_export_logs_user ON export_logs(user_id);
CREATE INDEX idx_export_logs_created ON export_logs(created_at DESC);

-- 7. Triggers using the correct function name
CREATE TRIGGER saved_reports_updated_at
  BEFORE UPDATE ON saved_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER dashboard_widgets_updated_at
  BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();