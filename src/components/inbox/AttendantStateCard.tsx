import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bot, User, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Colunas e função novas ainda não estão em types.ts: o client sem tipos evita regenerar o arquivo inteiro.
const db = supabase as any;

interface Props {
  chatId: string;
}

// Controle Mavie / humano da conversa. Só aparece em tenants com a integração ligada.
export function AttendantStateCard({ chatId }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: enabled } = useQuery({
    queryKey: ["integration-enabled"],
    queryFn: async () => {
      const { data } = await db.rpc("crm_integration_enabled");
      return data === true;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: chat } = useQuery({
    queryKey: ["chat-attendant-state", chatId],
    enabled: !!enabled,
    queryFn: async () => {
      const { data } = await db.from("chats").select("attendant_state, human_until").eq("id", chatId).single();
      return data as { attendant_state: string; human_until: string | null } | null;
    },
  });

  if (!enabled || !chat) return null;

  const humano = chat.attendant_state === "humano" && (!chat.human_until || new Date(chat.human_until) > new Date());

  async function change(estado: "humano" | "mavie") {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("crm-inbox", { body: { action: "state", chat_id: chatId, estado } });
      if (error || !data?.ok) throw error ?? new Error(data?.message);
      toast.success(estado === "mavie" ? "Mavie reativada nesta conversa" : "Mavie pausada nesta conversa");
      if (data.n8n === "pendente") toast.info("O aviso à Mavie será reenviado automaticamente.");
      queryClient.invalidateQueries({ queryKey: ["chat-attendant-state", chatId] });
    } catch {
      toast.error("Não foi possível alterar o atendimento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 mb-2">
      <div className={humano
        ? "p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
        : "p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"}>
        <div className={`flex items-center gap-2 mb-1 ${humano ? "text-blue-700 dark:text-blue-400" : "text-green-700 dark:text-green-400"}`}>
          {humano ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          <span className="font-semibold text-sm">{humano ? "Atendimento humano" : "Mavie atendendo"}</span>
        </div>
        <p className={`text-xs ${humano ? "text-blue-600 dark:text-blue-500" : "text-green-600 dark:text-green-500"}`}>
          {humano
            ? chat.human_until ? `A Mavie volta às ${format(new Date(chat.human_until), "dd/MM HH:mm")}` : "A Mavie fica pausada até você reativar"
            : "A Mavie responde as mensagens deste contato"}
        </p>
      </div>
      {humano ? (
        <Button onClick={() => change("mavie")} disabled={loading} variant="outline" className="w-full border-green-400 text-green-600 hover:bg-green-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bot className="h-4 w-4 mr-2" />}
          Ativar IA
        </Button>
      ) : (
        <Button onClick={() => change("humano")} disabled={loading} variant="outline" className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <User className="h-4 w-4 mr-2" />}
          Desativar IA
        </Button>
      )}
    </div>
  );
}
