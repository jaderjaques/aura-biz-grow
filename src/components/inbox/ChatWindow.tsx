import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChatHeader } from "./ChatHeader";
import { ChatMessage } from "./ChatMessage";
import { MessageInput } from "./MessageInput";
import { Loader2 } from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatWindowProps {
  chatId: string;
  onBack?: () => void;
  onToggleSidebar?: () => void;
}

export function ChatWindow({ chatId, onBack, onToggleSidebar }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  // Mark as read
  useEffect(() => {
    supabase
      .from("chats")
      .update({ unread_count: 0 })
      .eq("id", chatId)
      .then();
  }, [chatId]);

  // Realtime messages
  useEffect(() => {
    if (!chatId) {
      return;
    }

    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.chat_id !== chatId) return;
          queryClient.setQueryData(["messages", chatId], (old: any) => {
            if (!old) return [newMsg];
            const exists = old.some((m: any) => m.id === newMsg.id);
            if (exists) return old;
            return [...old, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);

  // Polling fallback — refetch a cada 5s caso Realtime falhe, pausa quando aba está oculta
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const startPolling = () => {
      interval = setInterval(() => {
        queryClient.refetchQueries({ queryKey: ["messages", chatId] });
      }, 5000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    startPolling();

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [chatId, queryClient]);

  // Realtime chat status (ai_mode, assumed_by, last_message_preview)
  useEffect(() => {
    const channel = supabase
      .channel(`chat-status-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chats",
          filter: `id=eq.${chatId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-input-status", chatId] });
          queryClient.invalidateQueries({ queryKey: ["chat-header", chatId] });
          queryClient.invalidateQueries({ queryKey: ["chat-sidebar", chatId] });
          queryClient.invalidateQueries({ queryKey: ["inbox-chats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <ChatHeader chatId={chatId} onBack={onBack} onToggleSidebar={onToggleSidebar} />

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages && messages.length > 0 ? (
          <>
            {messages.map((msg, index) => {
              const msgDate = new Date(msg.created_at);
              const prevDate = index > 0 ? new Date(messages[index - 1].created_at) : null;
              const showSeparator = !prevDate || !isSameDay(msgDate, prevDate);

              let dateLabel = "";
              if (showSeparator) {
                if (isToday(msgDate)) dateLabel = "Hoje";
                else if (isYesterday(msgDate)) dateLabel = "Ontem";
                else dateLabel = format(msgDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
              }

              return (
                <div key={msg.id}>
                  {showSeparator && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground font-medium px-2 whitespace-nowrap">
                        {dateLabel}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <ChatMessage message={msg} />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Nenhuma mensagem ainda
          </div>
        )}
      </div>

      <MessageInput chatId={chatId} />
    </div>
  );
}
