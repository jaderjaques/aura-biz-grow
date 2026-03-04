import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export async function sendWhatsAppMessage({
  chatId,
  message,
}: {
  chatId: string;
  message: string;
}) {
  const { data: chat, error } = await supabase
    .from("chats")
    .select("device_id, contact_number, remote_jid")
    .eq("id", chatId)
    .single();

  if (error || !chat) throw new Error("Chat não encontrado");

  // Get the device with instance name
  const { data: device } = await supabase
    .from("whatsapp_devices")
    .select("api_url, api_token, device_name")
    .eq("id", chat.device_id!)
    .single();

  if (!device) throw new Error("Dispositivo não encontrado");

  const phoneNumber = (chat.contact_number || chat.remote_jid || "").replace(/\D/g, "");

  // AvisaAPI format
  const response = await fetch("https://www.avisaapi.com.br/api/actions/sendMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${device.api_token}`,
    },
    body: JSON.stringify({
      number: phoneNumber,
      message: message,
    }),
  });

  if (!response.ok) {
    throw new Error("Erro ao enviar mensagem via WhatsApp");
  }

  return await response.json();
}

export function formatRelativeTime(date: string | null): string {
  if (!date) return "";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `há ${diffMins} min`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `há ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays} dias`;

  return format(then, "dd/MM/yyyy");
}
