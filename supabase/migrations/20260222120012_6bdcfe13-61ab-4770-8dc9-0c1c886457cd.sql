
-- Fix search_path on all new functions
ALTER FUNCTION update_chat_on_new_message() SET search_path = public;
ALTER FUNCTION reset_unread_count() SET search_path = public;
ALTER FUNCTION mark_chat_as_read(UUID) SET search_path = public;
ALTER FUNCTION archive_chat(UUID) SET search_path = public;
ALTER FUNCTION get_or_create_chat(UUID, TEXT, TEXT) SET search_path = public;
ALTER FUNCTION cleanup_old_messages_balanced() SET search_path = public;
ALTER FUNCTION cleanup_chat_webhook_logs() SET search_path = public;
ALTER FUNCTION should_save_media(UUID, TEXT) SET search_path = public;
