// supabase/functions/extract-lead/index.ts
// Fase 1.3 — Extração/enriquecimento de LEAD a partir da conversa do WhatsApp.
// Função ISOLADA: a mavie-chat (cérebro compartilhado) NÃO é tocada.
// Se falhar, o atendimento segue normal — no pior caso, um lead deixa de ser registrado.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Só preenche se o extraído tem valor; caso contrário mantém o atual (enriquecimento progressivo).
function pick(val: unknown, current: unknown): unknown {
  if (val !== null && val !== undefined && String(val).trim() !== "") return val;
  return current ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { chat_id } = await req.json();
    if (!chat_id) throw new Error("chat_id obrigatório");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Carregar chat (tenant + contato)
    const { data: chat, error: chatErr } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chat_id)
      .single();
    if (chatErr || !chat) throw new Error("Chat não encontrado");

    // Ignorar grupos
    if (chat.is_group) {
      return new Response(
        JSON.stringify({ skipped: "grupo" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantId = chat.tenant_id || "responde-uai";

    // 2. Histórico da conversa
    const { data: history } = await supabase
      .from("chat_messages")
      .select("direction, content, created_at")
      .eq("chat_id", chat_id)
      .order("created_at", { ascending: true })
      .limit(60);

    if (!history || history.length === 0) {
      return new Response(
        JSON.stringify({ skipped: "sem mensagens" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transcript = history
      .map((m) => `${m.direction === "incoming" ? "Cliente" : "Atendente"}: ${m.content}`)
      .join("\n");

    // 3. Prompt de extração (estruturado, anti-alucinação)
    const prompt = `Você é um extrator de dados de CRM. A partir da conversa de WhatsApp abaixo, extraia os dados do LEAD.
REGRA: use null quando a informação NÃO estiver CLARAMENTE presente na conversa. NUNCA invente.

Retorne SOMENTE um JSON com estas chaves:
- contact_name: nome da pessoa (string|null)
- company_name: nome da empresa (string|null)
- email: (string|null)
- segment: segmento/nicho da empresa (string|null)
- needs: necessidade/dor principal, resumo curto (string|null)
- bant_need: o que a pessoa precisa, se explicitado (string|null)
- bant_budget: orçamento/disposição de investir, se mencionado (string|null)
- bant_authority: se a pessoa é decisora, se indicado (string|null)
- bant_timeline: prazo/urgência, se mencionado (string|null)
- tags: array de 1 a 3 rótulos curtos úteis para segmentar (ex.: nicho, interesse). [] se nada claro.

Conversa:
${transcript}`;

    const geminiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!geminiKey) throw new Error("GOOGLE_API_KEY não configurada");

    const llmResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!llmResp.ok) {
      const t = await llmResp.text();
      throw new Error(`Gemini error: ${t.substring(0, 200)}`);
    }

    const llmData = await llmResp.json();
    const rawText =
      llmData.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") || "{}";

    let ex: Record<string, unknown> = {};
    try {
      ex = JSON.parse(rawText);
    } catch {
      ex = {};
    }

    // 4. Lead existente por chat_id (dedup + enriquecimento)
    const { data: existing } = await supabase
      .from("leads")
      .select("*")
      .eq("chat_id", chat_id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const merged = {
      contact_name: pick(ex.contact_name, existing?.contact_name ?? chat.contact_name),
      company_name: pick(ex.company_name, existing?.company_name),
      email: pick(ex.email, existing?.email),
      phone: existing?.phone ?? chat.contact_number ?? null,
      segment: pick(ex.segment, existing?.segment),
      needs: pick(ex.needs, existing?.needs),
      bant_need: pick(ex.bant_need, existing?.bant_need),
      bant_budget: pick(ex.bant_budget, existing?.bant_budget),
      bant_authority: pick(ex.bant_authority, existing?.bant_authority),
      bant_timeline: pick(ex.bant_timeline, existing?.bant_timeline),
    };

    // BANT progressivo: score = proporção dos 4 campos preenchidos
    const bantFilled = [
      merged.bant_need,
      merged.bant_budget,
      merged.bant_authority,
      merged.bant_timeline,
    ].filter((v) => v && String(v).trim() !== "").length;
    const bant_score = Math.round((bantFilled / 4) * 100);
    const bant_qualified = bantFilled === 4;

    let leadId: string | undefined;

    if (existing) {
      await supabase
        .from("leads")
        .update({
          ...merged,
          bant_score,
          bant_qualified,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      leadId = existing.id;
    } else {
      // Etapa inicial do funil do tenant
      const { data: firstStage } = await supabase
        .from("pipeline_stages")
        .select("name")
        .eq("tenant_id", tenantId)
        .order("stage_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      const { data: created, error: insErr } = await supabase
        .from("leads")
        .insert({
          ...merged,
          bant_score,
          bant_qualified,
          tenant_id: tenantId,
          chat_id,
          source: "whatsapp",
          status: "novo",
          stage: firstStage?.name ?? "Prospecção",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      leadId = created?.id;
    }

    // 5. Tags sugeridas (cria no tenant se faltar + vincula sem duplicar)
    const tags = Array.isArray(ex.tags) ? (ex.tags as unknown[]).slice(0, 3) : [];
    for (const raw of tags) {
      const name = String(raw).trim();
      if (!name || !leadId) continue;

      let { data: tag } = await supabase
        .from("tags")
        .select("id")
        .eq("tenant_id", tenantId)
        .ilike("name", name)
        .maybeSingle();

      if (!tag) {
        const { data: newTag } = await supabase
          .from("tags")
          .insert({ name, tenant_id: tenantId, category: "ia", color: "#6366f1" })
          .select("id")
          .single();
        tag = newTag;
      }

      if (tag) {
        const { data: link } = await supabase
          .from("lead_tags")
          .select("lead_id")
          .eq("lead_id", leadId)
          .eq("tag_id", tag.id)
          .maybeSingle();
        if (!link) {
          await supabase
            .from("lead_tags")
            .insert({ lead_id: leadId, tag_id: tag.id, tenant_id: tenantId });
        }
      }
    }

    // 6. Auditoria
    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      user_name: "Mavie IA",
      action: "lead_ia_extract",
      resource_type: "lead",
      resource_id: leadId,
      description: `Lead ${existing ? "atualizado" : "criado"} pela IA a partir da conversa do WhatsApp`,
      changes: { extracted: ex, bant_score, tags },
      severity: "info",
    });

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: leadId,
        created: !existing,
        bant_score,
        bant_qualified,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("extract-lead error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
