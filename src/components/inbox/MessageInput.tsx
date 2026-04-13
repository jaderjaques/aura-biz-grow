import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendWhatsAppMessage } from "@/lib/whatsapp-helpers";
import { getCurrentProfile } from "@/lib/tenant-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Bot, User } from "lucide-react";
import { toast } from "sonner";

interface MessageInputProps {
  chatId: string;
}

export function MessageInput({ chatId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: chat } = useQuery({
    queryKey: ["chat-input-status", chatId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chats")
        .select("ai_mode, needs_human, assumed_by")
        .eq("id", chatId)
        .single();
      return data;
    },
  });

  const { data: assumedProfile } = useQuery({
    queryKey: ["assumed-profile-input", chat?.assumed_by],
    queryFn: async () => {
      if (!chat?.assumed_by) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", chat.assumed_by)
        .single();
      return data;
    },
    enabled: !!chat?.assumed_by && chat?.assumed_by !== user?.id,
  });

  const isAuto = chat?.ai_mode === "auto";
  const isManual = chat?.ai_mode === "manual";
  const isAssumedByMe = chat?.assumed_by === user?.id;
  const isAssumedByOther = isManual && chat?.assumed_by && !isAssumedByMe;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + "px";
    }
  }, [message]);

  async function handleSend() {
    if (!message.trim() || sending) return;
    setSending(true);
    const trimmed = message.trim();
    try {
      setMessage("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      // 1. Salvar no banco PRIMEIRO
      const profile = await getCurrentProfile();
      const { error } = await supabase.from("chat_messages").insert({
        chat_id: chatId,
        direction: "outgoing",
        message_type: "text",
        content: trimmed,
        sender_id: profile.id,
        tenant_id: profile.tenant_id,
      });

      if (error) {
        toast.error("Erro ao salvar mensagem");
        return;
      }

      // 2. Enviar via WhatsApp
      try {
        await sendWhatsAppMessage({ chatId, message: trimmed });
      } catch {
        toast.warning("Mensagem salva, mas não foi possível enviar via WhatsApp");
      }

      // 3. Refetch APÓS confirmação do INSERT
      await queryClient.refetchQueries({ queryKey: ["messages", chatId] });
    } catch {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  if (isAuto) {
    return (
      <div className="border-t p-4 bg-green-50 dark:bg-green-950/30">
        <div className="flex items-center gap-3 text-sm text-green-700 dark:text-green-400">
          <Bot className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-semibold">IA está respondendo automaticamente</p>
            <p className="text-xs opacity-80">Para enviar mensagem, clique em "Assumir Conversa" na sidebar</p>
          </div>
        </div>
      </div>
    );
  }

  if (isAssumedByOther) {
    return (
      <div className="border-t p-4 bg-blue-50 dark:bg-blue-950/30">
        <div className="flex items-center gap-3 text-sm text-blue-700 dark:text-blue-400">
          <User className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-semibold">Atendido por {assumedProfile?.full_name || "outro atendente"}</p>
            <p className="text-xs opacity-80">Apenas o atendente responsável pode enviar mensagens</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t p-3 bg-card">
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Digite sua mensagem..."
          className="flex-1 resize-none min-h-[40px] max-h-32"
          rows={1}
          disabled={sending}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          size="icon"
          className="shrink-0"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
