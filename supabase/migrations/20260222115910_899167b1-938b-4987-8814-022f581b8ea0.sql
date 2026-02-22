
-- ==================== TABELAS DO MÓDULO CHAT ====================

CREATE TABLE whatsapp_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  display_name TEXT,
  status TEXT DEFAULT 'disconnected',
  api_url TEXT NOT NULL,
  api_token TEXT NOT NULL,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES whatsapp_devices(id) ON DELETE CASCADE,
  remote_jid TEXT NOT NULL,
  contact_name TEXT,
  contact_number TEXT,
  profile_pic_url TEXT,
  lead_id UUID REFERENCES leads(id),
  customer_id UUID REFERENCES customers(id),
  assigned_to UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  unread_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_from_me BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  UNIQUE(device_id, remote_jid)
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  message_id TEXT,
  direction TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  media_mimetype TEXT,
  media_filename TEXT,
  media_size BIGINT,
  thumbnail_url TEXT,
  caption TEXT,
  quoted_message_id UUID REFERENCES chat_messages(id),
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  sent_by UUID REFERENCES profiles(id),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  added_by UUID REFERENCES profiles(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, tag_id)
);

CREATE TABLE chat_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  first_response_time INTEGER,
  average_response_time INTEGER,
  resolution_time INTEGER,
  total_messages INTEGER DEFAULT 0,
  messages_from_customer INTEGER DEFAULT 0,
  messages_from_team INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES whatsapp_devices(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== ÍNDICES ====================
CREATE INDEX idx_devices_active ON whatsapp_devices(is_active);
CREATE INDEX idx_chats_device ON chats(device_id);
CREATE INDEX idx_chats_status ON chats(status) WHERE status != 'archived';
CREATE INDEX idx_chats_assigned ON chats(assigned_to);
CREATE INDEX idx_chats_unread ON chats(unread_count) WHERE unread_count > 0;
CREATE INDEX idx_chats_last_message ON chats(last_message_at DESC);
CREATE INDEX idx_chats_lead ON chats(lead_id);
CREATE INDEX idx_chats_customer ON chats(customer_id);
CREATE INDEX idx_messages_chat ON chat_messages(chat_id);
CREATE INDEX idx_messages_created ON chat_messages(created_at DESC);
CREATE INDEX idx_messages_unread ON chat_messages(is_read) WHERE is_read = false;
CREATE INDEX idx_chat_tags_chat ON chat_tags(chat_id);
CREATE INDEX idx_chat_notes_chat ON chat_notes(chat_id);
CREATE INDEX idx_chat_wh_logs_created ON chat_webhook_logs(created_at DESC);
CREATE INDEX idx_chat_wh_logs_processed ON chat_webhook_logs(processed) WHERE processed = false;

-- ==================== RLS ====================
ALTER TABLE whatsapp_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view devices" ON whatsapp_devices FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage devices" ON whatsapp_devices FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users view chats" ON chats FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users update chats" ON chats FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "System create chats" ON chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Users delete chats" ON chats FOR DELETE USING (is_admin(auth.uid()));

CREATE POLICY "Users view messages" ON chat_messages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users create messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users update messages" ON chat_messages FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users manage chat tags" ON chat_tags FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users manage notes" ON chat_notes FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users view metrics" ON chat_metrics FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "System manage metrics" ON chat_metrics FOR ALL USING (true);

CREATE POLICY "Admins view chat wh logs" ON chat_webhook_logs FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "System insert chat wh logs" ON chat_webhook_logs FOR INSERT WITH CHECK (true);

-- ==================== TRIGGERS ====================
CREATE TRIGGER chats_updated_at_trigger
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER devices_updated_at_trigger
  BEFORE UPDATE ON whatsapp_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION update_chat_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats SET
    last_message_at = NEW.created_at,
    last_message_preview = CASE
      WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
      WHEN NEW.message_type = 'image' THEN '📷 Imagem'
      WHEN NEW.message_type = 'audio' THEN '🎵 Áudio'
      WHEN NEW.message_type = 'video' THEN '🎥 Vídeo'
      WHEN NEW.message_type = 'document' THEN '📄 Documento'
      WHEN NEW.message_type = 'ptt' THEN '🎤 Áudio de voz'
      ELSE '📎 Arquivo'
    END,
    last_message_from_me = (NEW.direction = 'outgoing'),
    unread_count = CASE
      WHEN NEW.direction = 'incoming' THEN chats.unread_count + 1
      ELSE chats.unread_count
    END,
    updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_chat_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_on_new_message();

CREATE OR REPLACE FUNCTION reset_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    UPDATE chats SET
      unread_count = GREATEST(unread_count - 1, 0)
    WHERE id = NEW.chat_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER reset_unread_trigger
  AFTER UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION reset_unread_count();

-- ==================== FUNCTIONS ====================

CREATE OR REPLACE FUNCTION mark_chat_as_read(p_chat_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chat_messages SET is_read = true
  WHERE chat_id = p_chat_id AND direction = 'incoming' AND is_read = false;
  UPDATE chats SET unread_count = 0 WHERE id = p_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION archive_chat(p_chat_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chats SET status = 'archived', archived_at = NOW() WHERE id = p_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_or_create_chat(
  p_device_id UUID, p_remote_jid TEXT, p_contact_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE v_chat_id UUID;
BEGIN
  SELECT id INTO v_chat_id FROM chats
  WHERE device_id = p_device_id AND remote_jid = p_remote_jid;

  IF v_chat_id IS NULL THEN
    INSERT INTO chats (device_id, remote_jid, contact_name, contact_number)
    VALUES (p_device_id, p_remote_jid, p_contact_name, regexp_replace(p_remote_jid, '[^0-9]', '', 'g'))
    RETURNING id INTO v_chat_id;
  ELSE
    IF p_contact_name IS NOT NULL THEN
      UPDATE chats SET contact_name = p_contact_name WHERE id = v_chat_id;
    END IF;
  END IF;
  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_old_messages_balanced()
RETURNS TABLE(deleted_texts INTEGER, deleted_media INTEGER, deleted_audio INTEGER) AS $$
DECLARE
  v_deleted_texts INTEGER; v_deleted_media INTEGER; v_deleted_audio INTEGER;
BEGIN
  DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '12 months'
  AND message_type = 'text' AND chat_id IN (SELECT id FROM chats WHERE status = 'archived' AND customer_id IS NULL);
  GET DIAGNOSTICS v_deleted_texts = ROW_COUNT;

  DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '6 months'
  AND message_type IN ('image', 'video', 'document', 'sticker')
  AND chat_id IN (SELECT id FROM chats WHERE customer_id IS NULL);
  GET DIAGNOSTICS v_deleted_media = ROW_COUNT;

  DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '3 months'
  AND message_type IN ('audio', 'ptt');
  GET DIAGNOSTICS v_deleted_audio = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_texts, v_deleted_media, v_deleted_audio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_chat_webhook_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_webhook_logs WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION should_save_media(p_chat_id UUID, p_message_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE v_should_save BOOLEAN;
BEGIN
  SELECT (customer_id IS NOT NULL OR status IN ('in_progress', 'resolved') OR priority IN ('high', 'urgent'))
  INTO v_should_save FROM chats WHERE id = p_chat_id;
  RETURN COALESCE(v_should_save, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
