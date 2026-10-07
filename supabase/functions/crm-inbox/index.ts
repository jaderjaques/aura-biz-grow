// crm-inbox: envio do Inbox pelo servidor (o token do AvisaAPI não chega mais ao navegador),
// controle Mavie/humano por conversa e entrega do webhook mavie-humano ao n8n (com fila de reenvio).
// Ações: send | state | test (usuário logado) e dispatch (cron, com segredo do Vault).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const WEBHOOK_PATH = "/webhook/mavie-humano";
const AVISA_URL = "https://www.avisaapi.com.br/api/actions/sendMessage";
const enc = new TextEncoder();

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
const err = (status: number, code: string, message: string, extra: Record<string, unknown> = {}) => json(status, { ok: false, error: code, message, ...extra });

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function signWebhook(secret: string, ts: string, body: string): Promise<string> {
  const hash = hex(await crypto.subtle.digest("SHA-256", enc.encode(body)));
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return "sha256=" + hex(await crypto.subtle.sign("HMAC", k, enc.encode([ts, "POST", WEBHOOK_PATH, hash].join("\n"))));
}

interface OutboxRow { o_id: string; o_tenant: string; o_event: string; o_telefone: string; o_estado: string; o_humano_ate: string | null; o_ocorrido_em: string; o_origem: string }

// Entrega um evento ao n8n. Devolve null se o n8n respondeu 2xx, ou o motivo da falha.
async function deliver(row: OutboxRow): Promise<string | null> {
  const { data, error } = await db.rpc("crm_webhook_config", { p_tenant: row.o_tenant });
  const cfg = (data as { o_url: string; o_key_id: string; o_secret: string }[] | null)?.[0];
  if (error || !cfg) return "webhook_nao_configurado";
  // ordem fixa dos campos e JSON compacto: é o texto que o receptor confere na assinatura
  const body = JSON.stringify({
    event_id: row.o_event, telefone: row.o_telefone, estado: row.o_estado,
    humano_ate: row.o_humano_ate ? new Date(row.o_humano_ate).toISOString() : null,
    ocorrido_em: new Date(row.o_ocorrido_em).toISOString(), origem: row.o_origem,
  });
  const ts = String(Math.floor(Date.now() / 1000));
  try {
    const res = await fetch(cfg.o_url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "X-Key-Id": cfg.o_key_id, "X-Timestamp": ts, "X-Signature": await signWebhook(cfg.o_secret, ts, body) },
      body,
      signal: AbortSignal.timeout(5000),
    });
    await res.body?.cancel();
    return res.status >= 200 && res.status < 300 ? null : `http_${res.status}`;
  } catch (e) {
    return (e as Error).name === "TimeoutError" ? "timeout" : "rede";
  }
}

async function deliverAndRecord(row: OutboxRow): Promise<boolean> {
  const falha = await deliver(row);
  await db.rpc("crm_outbox_done", { p_id: row.o_id, p_ok: falha === null, p_error: falha });
  return falha === null;
}

interface Who { id: string; tenant: string; role: string; superAdmin: boolean }

async function whoIs(req: Request): Promise<Who | null> {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data: u, error } = await db.auth.getUser(jwt);
  if (error || !u?.user) return null;
  const { data: p } = await db.from("profiles").select("id, tenant_id, role, is_active, is_super_admin").eq("id", u.user.id).maybeSingle();
  if (!p || p.is_active === false || !p.tenant_id) return null;
  return { id: p.id, tenant: p.tenant_id, role: p.role ?? "", superAdmin: !!p.is_super_admin };
}

async function avisaSend(token: string, number: string, message: string): Promise<boolean> {
  try {
    const res = await fetch(AVISA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ number, message }),
      signal: AbortSignal.timeout(15000),
    });
    await res.body?.cancel();
    return res.ok;
  } catch (_) {
    return false;
  }
}

async function actSend(who: Who, p: Record<string, unknown>): Promise<Response> {
  const chatId = String(p.chat_id ?? "");
  const text = typeof p.text === "string" ? p.text.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(chatId) || !text || text.length > 4000) return err(400, "requisicao_invalida", "Conversa ou texto inválido.");

  const { data: chat } = await db.from("chats").select("id, tenant_id, device_id, contact_number, remote_jid, ai_mode, assumed_by, last_message_at, total_messages, human_message_count")
    .eq("id", chatId).eq("tenant_id", who.tenant).maybeSingle();
  if (!chat) return err(404, "chat_inexistente", "Conversa não encontrada.");
  if (chat.ai_mode === "auto") return err(409, "ia_respondendo", "A IA está respondendo esta conversa.");
  if (chat.ai_mode === "manual" && chat.assumed_by && chat.assumed_by !== who.id) return err(403, "atendido_por_outro", "Outro atendente assumiu esta conversa.");
  if (!chat.device_id) return err(422, "sem_dispositivo", "A conversa não tem dispositivo de WhatsApp.");
  const { data: device } = await db.from("whatsapp_devices").select("api_token").eq("id", chat.device_id).eq("tenant_id", who.tenant).maybeSingle();
  if (!device?.api_token) return err(422, "sem_dispositivo", "Dispositivo não encontrado.");

  // 1) pausa a Mavie e só segue com o 2xx do n8n; sem 2xx, a mensagem NÃO sai
  const { data: st } = await db.rpc("crm_chat_state", { p_tenant: who.tenant, p_chat: chatId, p_estado: "humano", p_origem: "inbox_envio" });
  if (st?._erro) return err(422, st._erro, "Não foi possível atualizar o estado da conversa.");
  if (st?.habilitado) {
    const { data: claimed } = await db.rpc("crm_outbox_claim", { p_limit: 1, p_id: st.outbox_id });
    const row = (claimed as OutboxRow[] | null)?.[0];
    if (!row || !(await deliverAndRecord(row))) {
      return err(503, "pausa_nao_confirmada", "Não foi possível pausar a Mavie agora. A mensagem não foi enviada; tente de novo em instantes.", { reenvio_automatico: true });
    }
  }

  // 2) salva e envia
  const number = (chat.contact_number || chat.remote_jid || "").replace(/\D/g, "");
  const { data: msg, error: insErr } = await db.from("chat_messages").insert({
    chat_id: chatId, tenant_id: who.tenant, direction: "outgoing", message_type: "text", content: text,
    sender_id: who.id, sender_type: "human", metadata: { origem: "inbox", envio: "pendente" },
  }).select("id").single();
  if (insErr || !msg) return err(500, "erro_interno", "Erro ao salvar a mensagem.");

  const enviado = await avisaSend(device.api_token, number, text);
  await db.from("chat_messages").update({ metadata: { origem: "inbox", envio: enviado ? "ok" : "falhou" } }).eq("id", msg.id);
  await db.from("chats").update({
    last_message_preview: text.slice(0, 120), last_message_at: new Date().toISOString(),
    total_messages: (chat.total_messages ?? 0) + 1, human_message_count: (chat.human_message_count ?? 0) + 1,
  }).eq("id", chatId);
  if (!enviado) return err(502, "whatsapp_falhou", "Mensagem salva, mas não foi possível enviar pelo WhatsApp.", { mensagem_id: msg.id });
  return json(200, { ok: true, mensagem_id: msg.id, estado: st?.habilitado ? "humano" : null, humano_ate: st?.humano_ate ?? null });
}

async function actState(who: Who, p: Record<string, unknown>): Promise<Response> {
  const chatId = String(p.chat_id ?? "");
  const estado = p.estado;
  if (!/^[0-9a-f-]{36}$/i.test(chatId) || (estado !== "humano" && estado !== "mavie")) return err(400, "requisicao_invalida", "Conversa ou estado inválido.");
  const { data: st } = await db.rpc("crm_chat_state", {
    p_tenant: who.tenant, p_chat: chatId, p_estado: estado, p_origem: estado === "humano" ? "botao_desativar" : "botao_ativar",
  });
  if (st?._erro) return err(st._erro === "chat_inexistente" ? 404 : 422, st._erro, "Não foi possível alterar a conversa.");
  if (!st?.habilitado) return json(200, { ok: true, habilitado: false });
  // o CRM é a fonte da verdade: o estado já vale; o n8n é avisado agora e, se falhar, pela fila
  const { data: claimed } = await db.rpc("crm_outbox_claim", { p_limit: 1, p_id: st.outbox_id });
  const row = (claimed as OutboxRow[] | null)?.[0];
  const entregue = row ? await deliverAndRecord(row) : false;
  return json(200, { ok: true, habilitado: true, estado: st.estado, humano_ate: st.humano_ate, n8n: entregue ? "confirmado" : "pendente" });
}

async function actTest(who: Who, p: Record<string, unknown>): Promise<Response> {
  if (who.role !== "admin" && !who.superAdmin) return err(403, "sem_permissao", "Só administradores testam o envio.");
  const deviceId = String(p.device_id ?? "");
  const number = String(p.telefone ?? "").replace(/\D/g, "");
  const text = typeof p.mensagem === "string" ? p.mensagem.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(deviceId) || number.length < 10 || number.length > 15 || !text || text.length > 1000) return err(400, "requisicao_invalida", "Dados inválidos.");
  const { data: device } = await db.from("whatsapp_devices").select("api_token").eq("id", deviceId).eq("tenant_id", who.tenant).maybeSingle();
  if (!device?.api_token) return err(404, "sem_dispositivo", "Dispositivo não encontrado.");
  return (await avisaSend(device.api_token, number, text)) ? json(200, { ok: true }) : err(502, "whatsapp_falhou", "Não foi possível enviar pelo WhatsApp.");
}

async function actDispatch(): Promise<Response> {
  const { data } = await db.rpc("crm_outbox_claim", { p_limit: 20 });
  const rows = (data as OutboxRow[] | null) ?? [];
  const results = await Promise.all(rows.map((r) => deliverAndRecord(r)));
  return json(200, { ok: true, processados: rows.length, entregues: results.filter(Boolean).length });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return err(405, "metodo_nao_permitido", "Use POST.");
  try {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return err(400, "requisicao_invalida", "JSON inválido."); }
    if (body === null || typeof body !== "object") return err(400, "requisicao_invalida", "JSON inválido.");

    if (body.action === "dispatch") {
      const secret = req.headers.get("x-dispatch-secret") ?? "";
      const { data: ok } = await db.rpc("crm_dispatch_secret_ok", { p_secret: secret });
      return ok === true ? await actDispatch() : err(401, "nao_autorizado", "Não autorizado.");
    }
    const who = await whoIs(req);
    if (!who) return err(401, "nao_autorizado", "Faça login novamente.");
    if (body.action === "send") return await actSend(who, body);
    if (body.action === "state") return await actState(who, body);
    if (body.action === "test") return await actTest(who, body);
    return err(400, "requisicao_invalida", "Ação desconhecida.");
  } catch (e) {
    console.error(JSON.stringify({ erro: String((e as Error)?.message ?? e).slice(0, 200) }));
    return err(500, "erro_interno", "Erro interno.");
  }
});
