import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChatHeader } from "./ChatHeader";
import { ChatMessage } from "./ChatMessage";
import { MessageInput } from "./MessageInput";
import { Loader2 } from "lucide-react";

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
    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
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
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
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
