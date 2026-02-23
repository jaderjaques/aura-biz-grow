import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bot, User, AlertTriangle, Phone, Mail, Building2, Tag, StickyNote } from "lucide-react";
import { formatRelativeTime } from "@/lib/whatsapp-helpers";
import { format } from "date-fns";
import { toast } from "sonner";

interface ChatSidebarProps {
  chatId: string;
}

export function ChatSidebar({ chatId }: ChatSidebarProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: chat } = useQuery({
    queryKey: ["chat-sidebar", chatId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chats")
        .select("*, customer:customers(company_name, contact_name, email, phone)")
        .eq("id", chatId)
        .single();
      return data;
    },
  });

  const { data: tags } = useQuery({
    queryKey: ["chat-tags", chatId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_tags")
        .select("*, tag:tags(name, color)")
        .eq("chat_id", chatId);
      return data || [];
    },
  });

  const { data: notes } = useQuery({
    queryKey: ["chat-notes", chatId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_notes")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  async function handleAssume() {
    await supabase
      .from("chats")
      .update({
        assumed_by: user?.id || null,
        assumed_at: new Date().toISOString(),
        ai_mode: "paused",
      })
      .eq("id", chatId);
    toast.success("Conversa assumida!");
    queryClient.invalidateQueries({ queryKey: ["chat-sidebar", chatId] });
    queryClient.invalidateQueries({ queryKey: ["chat-input-status", chatId] });
    queryClient.invalidateQueries({ queryKey: ["chat-header", chatId] });
    queryClient.invalidateQueries({ queryKey: ["inbox-chats"] });
  }

  async function handleReturnToAI() {
    await supabase
      .from("chats")
      .update({
        assumed_by: null,
        assumed_at: null,
        ai_mode: "auto",
        needs_human: false,
      })
      .eq("id", chatId);
    toast.success("Conversa devolvida para IA");
    queryClient.invalidateQueries({ queryKey: ["chat-sidebar", chatId] });
    queryClient.invalidateQueries({ queryKey: ["chat-input-status", chatId] });
    queryClient.invalidateQueries({ queryKey: ["chat-header", chatId] });
    queryClient.invalidateQueries({ queryKey: ["inbox-chats"] });
  }

  const customer = chat?.customer as any;
  const metadata = chat?.metadata as Record<string, unknown> | null;

  return (
    <div className="p-4 space-y-5">
      {/* Status Section */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Status</h3>

        {chat?.ai_mode === "auto" && !chat?.assumed_by && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
              <Bot className="h-4 w-4" />
              <span className="font-semibold text-sm">IA Ativa</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-500">
              Mavie está respondendo automaticamente
            </p>
          </div>
        )}

        {chat?.needs_human && !chat?.assumed_by && (
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="flex items-center gap-2 text-destructive mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold text-sm">Precisa Atendimento</span>
              </div>
              {chat.escalation_reason && (
                <p className="text-xs text-destructive/80 mb-1">
                  Motivo: {chat.escalation_reason}
                </p>
              )}
              <p className="text-xs text-destructive/80">
                Escalado {formatRelativeTime(chat.escalated_at)}
              </p>
            </div>
            <Button onClick={handleAssume} variant="destructive" className="w-full">
              Assumir Conversa
            </Button>
          </div>
        )}

        {chat?.assumed_by && (
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-1">
                <User className="h-4 w-4" />
                <span className="font-semibold text-sm">Atendimento Humano</span>
              </div>
              {chat.assumed_at && (
                <p className="text-xs text-blue-600 dark:text-blue-500">
                  Desde: {format(new Date(chat.assumed_at), "dd/MM HH:mm")}
                </p>
              )}
            </div>
            {chat.assumed_by === user?.id && (
              <Button onClick={handleReturnToAI} variant="outline" className="w-full border-green-400 text-green-600 hover:bg-green-50">
                Devolver para IA
              </Button>
            )}
          </div>
        )}
      </div>

      {/* AI Summary */}
      {metadata?.ai_summary && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-2">📋 Resumo IA</h3>
            <div className="p-3 rounded-lg bg-muted text-sm whitespace-pre-wrap">
              {String(metadata.ai_summary)}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Contact Info */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Contato</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>{chat?.contact_name || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            <span>{chat?.contact_number || "N/A"}</span>
          </div>
          {customer && (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>{customer.company_name}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span>{customer.email}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Tags */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Tag className="h-3.5 w-3.5" />
          <h3 className="text-sm font-semibold">Tags</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tags?.map((ct) => {
            const tag = ct.tag as any;
            return (
              <Badge key={ct.id} variant="secondary" className="text-xs">
                {tag?.name || "Tag"}
              </Badge>
            );
          })}
          {(!tags || tags.length === 0) && (
            <span className="text-xs text-muted-foreground">Sem tags</span>
          )}
        </div>
      </div>

      <Separator />

      {/* Notes */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <StickyNote className="h-3.5 w-3.5" />
          <h3 className="text-sm font-semibold">Notas Internas</h3>
        </div>
        <div className="space-y-2">
          {notes?.map((note) => (
            <div key={note.id} className="p-2 rounded bg-muted text-xs">
              <p>{note.note}</p>
              <span className="text-muted-foreground text-[10px]">
                {formatRelativeTime(note.created_at)}
              </span>
            </div>
          ))}
          {(!notes || notes.length === 0) && (
            <span className="text-xs text-muted-foreground">Sem notas</span>
          )}
        </div>
      </div>
    </div>
  );
}
