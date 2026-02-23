import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AIStatusBadge } from "./AIStatusBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info } from "lucide-react";

interface ChatHeaderProps {
  chatId: string;
  onBack?: () => void;
  onToggleSidebar?: () => void;
}

export function ChatHeader({ chatId, onBack, onToggleSidebar }: ChatHeaderProps) {
  const { data: chat } = useQuery({
    queryKey: ["chat-header", chatId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chats")
        .select("contact_name, contact_number, ai_mode, needs_human, assumed_by, profile_pic_url")
        .eq("id", chatId)
        .single();
      return data;
    },
  });

  const initials = chat?.contact_name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
      {onBack && (
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate text-sm">
            {chat?.contact_name || chat?.contact_number || "Carregando..."}
          </span>
          <AIStatusBadge
            aiMode={chat?.ai_mode ?? null}
            needsHuman={chat?.needs_human ?? null}
            assumedBy={chat?.assumed_by ?? null}
          />
        </div>
        <span className="text-xs text-muted-foreground">{chat?.contact_number}</span>
      </div>

      {onToggleSidebar && (
        <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
          <Info className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
