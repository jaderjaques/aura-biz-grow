// mavie-atto-api: API da Mavie (n8n) para o CRM.
// Auth própria por HMAC (verify_jwt=false). O tenant vem SEMPRE da chave, nunca do pedido.
// Toda a lógica de dados fica em funções SQL integration_* (filtro por tenant e por contato dentro do SQL).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const MAX_BODY = 64 * 1024;
const WINDOW_S = 300;
const PHONE_LIMIT_RPM = 30;
const enc = new TextEncoder();

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface Field { t: "string" | "number" | "boolean"; req?: boolean; max?: number; enum?: string[]; int?: boolean; min?: number; maxN?: number }
interface Route { scope: "atto:read" | "atto:write"; fn?: string; write?: boolean; fields: Record<string, Field> }

const TEL: Field = { t: "string", req: true, max: 40 };
const WA_OPT: Field = { t: "string", max: 128 };
const WA_REQ: Field = { t: "string", req: true, max: 128 };

const ROUTES: Record<string, Route> = {
  "/v1/leitura/cliente": { scope: "atto:read", fn: "integration_leitura_cliente", fields: { telefone: TEL, wa_message_id: WA_OPT } },
  "/v1/leitura/servicos": { scope: "atto:read", fn: "integration_leitura_servicos", fields: { ativo: { t: "boolean" }, categoria: { t: "string", max: 80 } } },
  "/v1/leitura/propostas": { scope: "atto:read", fn: "integration_leitura_propostas", fields: { telefone: TEL, wa_message_id: WA_REQ } },
  "/v1/leitura/faturas": {
    scope: "atto:read", fn: "integration_leitura_faturas",
    fields: {
      telefone: TEL, wa_message_id: WA_REQ,
      status: { t: "string", enum: ["pendente", "paga", "vencida", "cancelada", "estornada"] },
      limite: { t: "number", int: true, min: 1, maxN: 20 },
    },
  },
  "/v1/leitura/contrato": { scope: "atto:read", fn: "integration_leitura_contrato", fields: { telefone: TEL, wa_message_id: WA_REQ } },
  "/v1/leitura/estado-chat": { scope: "atto:read", fn: "integration_leitura_estado_chat", fields: { telefone: TEL } },
  "/v1/escrita/mensagem": {
    scope: "atto:write", write: true, fn: "integration_escrita_mensagem",
    fields: {
      telefone: TEL, nome_contato: { t: "string", max: 120 }, wa_message_id: WA_REQ,
      direcao: { t: "string", req: true, enum: ["entrada", "saida_mavie", "saida_humano_whatsapp"] },
      tipo: { t: "string", req: true, enum: ["texto", "audio", "ptt", "imagem", "video", "arquivo", "localizacao", "contato", "figurinha"] },
      // Informe `conteudo` OU `conteudo_b64` (texto UTF-8 em base64): a Cloudflare na frente do Supabase
      // pode barrar (403 HTML) mensagens de cliente que pareçam SQL; em base64 isso não acontece.
      conteudo: { t: "string", max: 4000 },
      conteudo_b64: { t: "string", max: 8000 },
      enviado_em: { t: "string", req: true, max: 40 },
    },
  },
  // Fase 2 (ainda sem implementação): respondem 501 depois da autenticação e do escopo.
  "/v1/escrita/lead": { scope: "atto:write", write: true, fields: {} },
  "/v1/escrita/evento": { scope: "atto:write", write: true, fields: {} },
  "/v1/escrita/etapa": { scope: "atto:write", write: true, fields: {} },
  "/v1/escrita/tarefa": { scope: "atto:write", write: true, fields: {} },
  "/v1/escrita/converter-lead": { scope: "atto:write", write: true, fields: {} },
  "/v1/escrita/cliente": { scope: "atto:write", write: true, fields: {} },
};

const MENSAGENS: Record<string, string> = {
  telefone_invalido: "Telefone inválido.",
  evento_de_entrada_invalido: "Não há mensagem de entrada recente com este wa_message_id para este telefone.",
  dados_incompletos: "Dados incompletos ou inválidos.",
  telefone_e_do_proprio_device: "O telefone é o do próprio número da Atto.",
};

interface Ctx { requestId: string; tenant: string; keyId: string; route: string }
interface Auth { keyId: string; tenant: string; scopes: string[]; rpm: number }

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (d: Uint8Array) => hex(await crypto.subtle.digest("SHA-256", d));

async function hmacHex(secret: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function reply(status: number, body: unknown, requestId: string, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Request-Id": requestId, ...extra },
  });
}

function fail(status: number, code: string, message: string, requestId: string, headers: Record<string, string> = {}, extra: Record<string, unknown> = {}): Response {
  return reply(status, { ok: false, error: { code, message, ...extra }, request_id: requestId }, requestId, headers);
}

async function readBody(req: Request): Promise<Uint8Array | null> {
  if (Number(req.headers.get("content-length") ?? "0") > MAX_BODY) return null;
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BODY) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

async function authenticate(req: Request, raw: Uint8Array, path: string): Promise<Auth | null> {
  const keyId = req.headers.get("x-key-id") ?? "";
  const ts = req.headers.get("x-timestamp") ?? "";
  const sig = req.headers.get("x-signature") ?? "";
  const formatOk = /^mav_[0-9a-f]{8}$/.test(keyId) && /^\d{10}$/.test(ts) && /^sha256=[0-9a-f]{64}$/.test(sig);

  let row: { o_tenant_id: string; o_scopes: string[]; o_secret: string; o_rpm: number; o_ativa: boolean } | undefined;
  if (formatOk) {
    const { data, error } = await db.rpc("integration_key_lookup", { p_key_id: keyId });
    if (error) throw error;
    row = (data as typeof row[])?.[0];
  }
  // Calcula o HMAC mesmo com chave inexistente, para o tempo de resposta não revelar se a chave existe.
  const bodyHash = await sha256(raw);
  const expected = "sha256=" + await hmacHex(row?.o_secret ?? "chave-inexistente", [ts, "POST", path, bodyHash].join("\n"));
  const sigOk = safeEqual(expected, formatOk ? sig : "sha256=" + "0".repeat(64));
  const fresh = formatOk && Math.abs(Date.now() / 1000 - Number(ts)) <= WINDOW_S;
  if (!formatOk || !row || !row.o_ativa || !sigOk || !fresh) return null;
  return { keyId, tenant: row.o_tenant_id, scopes: row.o_scopes, rpm: row.o_rpm };
}

async function rate(bucket: string, limit: number): Promise<boolean> {
  const { data, error } = await db.rpc("integration_rate_hit", { p_bucket: bucket, p_limit: limit });
  if (error) throw error;
  return data === true;
}

function limited(rid: string): Response {
  return fail(429, "limite_excedido", "Limite de requisições excedido.", rid, { "Retry-After": String(Math.max(1, 60 - new Date().getUTCSeconds())) });
}

function validate(body: unknown, fields: Record<string, Field>): { value: Record<string, unknown>; bad: string[] } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { value: {}, bad: ["(corpo)"] };
  const obj = body as Record<string, unknown>;
  const bad: string[] = Object.keys(obj).filter((k) => !(k in fields));
  for (const [k, f] of Object.entries(fields)) {
    const v = obj[k];
    if (v === undefined || v === null) { if (f.req) bad.push(k); continue; }
    if (typeof v !== f.t) { bad.push(k); continue; }
    if (f.t === "string") {
      const s = v as string;
      if (s.length > (f.max ?? 500) || (f.req && s.trim() === "") || (f.enum && !f.enum.includes(s))) bad.push(k);
    } else if (f.t === "number") {
      const n = v as number;
      if (!Number.isFinite(n) || (f.int && !Number.isInteger(n)) || (f.min !== undefined && n < f.min) || (f.maxN !== undefined && n > f.maxN)) bad.push(k);
    }
  }
  return { value: obj, bad: [...new Set(bad)] };
}

async function handle(req: Request, ctx: Ctx): Promise<Response> {
  const rid = ctx.requestId;
  if (req.method !== "POST") return fail(405, "metodo_nao_permitido", "Use POST.", rid, { Allow: "POST" });

  const raw = await readBody(req);
  if (raw === null) return fail(413, "corpo_grande", "Corpo acima de 64 KB.", rid);

  const path = new URL(req.url).pathname.replace(/^\/functions\/v1\/mavie-atto-api/, "").replace(/^\/mavie-atto-api/, "");
  ctx.route = path;

  const auth = await authenticate(req, raw, path);
  if (!auth) return fail(401, "nao_autorizado", "Credenciais inválidas.", rid);
  ctx.tenant = auth.tenant;
  ctx.keyId = auth.keyId;

  if (!(await rate(`key:${auth.keyId}`, auth.rpm))) return limited(rid);

  const route = ROUTES[path];
  if (!route) return fail(404, "rota_inexistente", "Rota inexistente.", rid);
  if (!auth.scopes.includes(route.scope)) return fail(403, "escopo_insuficiente", "A chave não tem o escopo desta rota.", rid);
  if (!route.fn) return fail(501, "nao_implementado", "Rota ainda não disponível.", rid);

  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)); }
  catch { return fail(400, "requisicao_invalida", "JSON inválido.", rid); }
  const { value, bad } = validate(parsed, route.fields);
  if (bad.length) return fail(400, "requisicao_invalida", "Campos inválidos.", rid, {}, { campos: bad });

  if (typeof value.telefone === "string" && !/^[0-9 ()+.-]{8,30}$/.test(value.telefone)) {
    return fail(422, "telefone_invalido", MENSAGENS.telefone_invalido, rid);
  }
  if (path === "/v1/escrita/mensagem") {
    const hasA = value.conteudo !== undefined && value.conteudo !== null;
    const hasB = value.conteudo_b64 !== undefined && value.conteudo_b64 !== null;
    if (hasA === hasB) return fail(400, "requisicao_invalida", "Informe conteudo ou conteudo_b64.", rid, {}, { campos: ["conteudo", "conteudo_b64"] });
    if (hasB) {
      try {
        const bytes = Uint8Array.from(atob(value.conteudo_b64 as string), (c) => c.charCodeAt(0));
        value.conteudo = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        delete value.conteudo_b64;
      } catch { return fail(400, "requisicao_invalida", "conteudo_b64 inválido.", rid, {}, { campos: ["conteudo_b64"] }); }
      if ((value.conteudo as string).length > 4000) return fail(400, "requisicao_invalida", "Conteúdo acima de 4000 caracteres.", rid, {}, { campos: ["conteudo_b64"] });
    }
  }

  const tel = typeof value.telefone === "string" ? value.telefone.replace(/\D/g, "").slice(0, 15) : "";
  if (tel && !(await rate(`phone:${auth.tenant}:${tel}`, PHONE_LIMIT_RPM))) return limited(rid);

  let idem = "";
  let bodyHash = "";
  if (route.write) {
    idem = req.headers.get("idempotency-key") ?? "";
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idem)) {
      return fail(400, "requisicao_invalida", "Idempotency-Key obrigatório (8 a 128 caracteres).", rid, {}, { campos: ["Idempotency-Key"] });
    }
    bodyHash = await sha256(raw);
    const { data: chk, error: chkErr } = await db.rpc("integration_idem_check", { p_key_id: auth.keyId, p_idem: idem, p_hash: bodyHash });
    if (chkErr) throw chkErr;
    if (chk.state === "conflict") return fail(422, "idempotencia_conflito", "Mesma Idempotency-Key com corpo diferente.", rid);
    if (chk.state === "replay") return reply(chk.status, chk.response, rid, { "Idempotent-Replay": "true" });
  }

  const { data, error } = await db.rpc(route.fn, { p_tenant: auth.tenant, p: value });
  if (error) throw error;
  if (data && typeof data === "object" && "_erro" in data) {
    const code = String((data as { _erro: string })._erro);
    return fail(422, code, MENSAGENS[code] ?? "Regra de negócio.", rid);
  }
  const body = { ok: true, data, request_id: rid };
  if (route.write) {
    const { error: saveErr } = await db.rpc("integration_idem_save", { p_key_id: auth.keyId, p_idem: idem, p_hash: bodyHash, p_status: 200, p_response: body });
    if (saveErr) throw saveErr;
  }
  return reply(200, body, rid);
}

Deno.serve(async (req) => {
  const ctx: Ctx = { requestId: crypto.randomUUID(), tenant: "", keyId: "", route: "" };
  let res: Response;
  try {
    res = await handle(req, ctx);
  } catch (e) {
    console.error(JSON.stringify({ request_id: ctx.requestId, erro: String((e as Error)?.message ?? e).slice(0, 200) }));
    res = fail(500, "erro_interno", "Erro interno.", ctx.requestId);
  }
  console.log(JSON.stringify({ request_id: ctx.requestId, route: ctx.route, key: ctx.keyId, status: res.status }));
  if (ctx.tenant && ctx.keyId) {
    try {
      await db.rpc("integration_audit", { p_tenant: ctx.tenant, p_key_id: ctx.keyId, p_route: ctx.route || "?", p_status: res.status, p_request_id: ctx.requestId });
    } catch (_) { /* a auditoria nunca derruba a resposta */ }
  }
  return res;
});
