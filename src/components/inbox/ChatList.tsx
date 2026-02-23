import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AIStatusBadge } from "./AIStatusBadge";
import { formatRelativeTime } from "@/lib/whatsapp-helpers";
import { cn } from "@/lib/utils";
import { Search, Loader2 } from "lucide-react";

type Filter = "all" | "needs_attention" | "ai_active" | "human";

interface ChatListProps {
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
}

export function ChatList({ selectedChatId, onSelectChat }: ChatListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const queryClient = useQueryClient();

  const { data: chats, isLoading } = useQuery({
    queryKey: ["inbox-chats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chats")
        .select("*, customer:customers(company_name, contact_name)")
        .order("last_message_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("inbox-chats-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, () => {
        queryClient.invalidateQueries({ queryKey: ["inbox-chats"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const filtered = useMemo(() => {
    if (!chats) return [];
    let result = chats;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.contact_name?.toLowerCase().includes(q) ||
          c.contact_number?.toLowerCase().includes(q) ||
          (c.customer as any)?.company_name?.toLowerCase().includes(q)
      );
    }

    if (filter === "needs_attention") result = result.filter((c) => c.needs_human && !c.assumed_by);
    if (filter === "ai_active") result = result.filter((c) => c.ai_mode === "auto" && !c.assumed_by);
    if (filter === "human") result = result.filter((c) => !!c.assumed_by);

    return result;
  }, [chats, search, filter]);

  const counts = useMemo(() => {
    if (!chats) return { all: 0, needs_attention: 0, ai_active: 0, human: 0 };
    return {
      all: chats.length,
      needs_attention: chats.filter((c) => c.needs_human && !c.assumed_by).length,
      ai_active: chats.filter((c) => c.ai_mode === "auto" && !c.assumed_by).length,
      human: chats.filter((c) => !!c.assumed_by).length,
    };
  }, [chats]);

  const filters: { key: Filter; label: string; emoji: string }[] = [
    { key: "all", label: "Todos", emoji: "" },
    { key: "needs_attention", label: "Atenção", emoji: "🔴" },
    { key: "ai_active", label: "IA", emoji: "🤖" },
    { key: "human", label: "Humano", emoji: "👤" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filters */}
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f.emoji && <span className="mr-1">{f.emoji}</span>}
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>
      </div>

      {/* Chat Items */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Nenhuma conversa encontrada
          </div>
        ) : (
          filtered.map((chat) => {
            const customer = chat.customer as any;
            const displayName = chat.contact_name || customer?.contact_name || chat.contact_number || "Desconhecido";
            const initials = displayName.charAt(0).toUpperCase();

            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={cn(
                  "flex items-start gap-3 p-3 cursor-pointer border-b transition-colors hover:bg-accent/50",
                  selectedChatId === chat.id && "bg-accent border-l-2 border-l-primary"
                )}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-medium text-sm truncate">{displayName}</span>
                    <AIStatusBadge
                      aiMode={chat.ai_mode}
                      needsHuman={chat.needs_human}
                      assumedBy={chat.assumed_by}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground truncate mb-1">
                    {chat.last_message_preview || "Sem mensagens"}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(chat.last_message_at)}
                    </span>
                    {(chat.unread_count ?? 0) > 0 && (
                      <Badge className="h-5 min-w-5 flex items-center justify-center text-[10px] px-1.5">
                        {chat.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
