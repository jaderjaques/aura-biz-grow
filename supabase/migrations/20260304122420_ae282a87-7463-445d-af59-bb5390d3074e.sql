
CREATE OR REPLACE FUNCTION public.assume_chat(p_chat_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE chats SET
    assumed_by = auth.uid(),
    assumed_at = NOW(),
    ai_mode = 'manual',
    needs_human = false
  WHERE id = p_chat_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.return_chat_to_ai(p_chat_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE chats SET
    assumed_by = NULL,
    assumed_at = NULL,
    ai_mode = 'auto',
    needs_human = false
  WHERE id = p_chat_id;
END;
$$;
