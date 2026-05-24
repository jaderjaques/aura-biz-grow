// supabase/functions/bant-daily-summary/index.ts
// Fase 1.4 — IA interna: resumo diário do funil (BANT) + ações sugeridas.
// Função ISOLADA, somente leitura dos leads. Roda 1x/dia via pg_cron.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// deno-lint-ignore no-explicit-any
async function summarizeTenant(supabase: any, geminiKey: string, tenantId: string, tenantName: string) {
  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();

  const { data: leads } = await supabase
    .from("leads")
    .select("company_name, segment, needs, stage, status, bant_score, bant_qualified, source, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  const all = leads || [];
  const open = all.filter(
    (l: Record<string, unknown>) => l.status !== "convertido" && l.status !== "perdido"
  );

  const byStage: Record<string, number> = {};
  for (const l of open) {
    const s = (l.stage as string) || "Sem etapa";
    byStage[s] = (byStage[s] || 0) + 1;
  }

  const score = (l: Record<string, unknown>) => Number(l.bant_score) || 0;
  const metrics = {
    total_open: open.length,
    new_today: all.filter((l: Record<string, unknown>) => String(l.created_at || "").slice(0, 10) === today).length,
    qualified: open.filter((l: Record<string, unknown>) => l.bant_qualified).length,
    avg_score: open.length ? Math.round(open.reduce((s: number, l: Record<string, unknown>) => s + score(l), 0) / open.length) : 0,
    hot: open.filter((l: Record<string, unknown>) => score(l) >= 75).length,
    warm: open.filter((l: Record<string, unknown>) => score(l) >= 40 && score(l) < 75).length,
    cold: open.filter((l: Record<string, unknown>) => score(l) < 40).length,
    by_stage: byStage,
    stale: 0,
  };

  const stale = open.filter((l: Record<string, unknown>) => {
    const u = new Date((l.updated_at as string) || (l.created_at as string)).getTime();
    return now - u > 7 * 86400000;
  });
  metrics.stale = stale.length;

  const staleSample = stale.slice(0, 8).map((l: Record<string, unknown>) => ({
    empresa: l.company_name, etapa: l.stage, score: l.bant_score, necessidade: l.needs,
  }));
  const qualifiedSample = open
    .filter((l: Record<string, unknown>) => l.bant_qualified)
    .slice(0, 8)
    .map((l: Record<string, unknown>) => ({ empresa: l.company_name, etapa: l.stage }));

  let resumo = "Sem dados suficientes para um resumo hoje.";
  let acoes: string[] = [];

  if (open.length > 0) {
    const prompt = `Você é um analista de vendas que usa a metodologia BANT. Gere o resumo diário do funil da empresa "${tenantName}".
Dados de hoje (${today}):
${JSON.stringify(metrics, null, 2)}

Leads parados (>7 dias sem atualização): ${JSON.stringify(staleSample)}
Leads qualificados (BANT completo): ${JSON.stringify(qualifiedSample)}

Responda SOMENTE um JSON:
{
  "resumo": "2 a 4 frases em português, tom executivo, destacando o que mais importa hoje",
  "acoes": ["3 a 5 ações concretas e priorizadas para melhorar a conversão no funil"]
}`;

    const llmResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
        }),
      }
    );

    if (llmResp.ok) {
      const llmData = await llmResp.json();
      const raw = llmData.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") || "{}";
      try {
        const parsed = JSON.parse(raw);
        if (parsed.resumo) resumo = parsed.resumo;
        if (Array.isArray(parsed.acoes)) acoes = parsed.acoes;
      } catch {
        // mantém defaults
      }
    }
  }

  await supabase
    .from("ai_daily_summaries")
    .upsert(
      {
        tenant_id: tenantId,
        summary_date: today,
        content: resumo,
        metrics,
        actions: acoes,
      },
      { onConflict: "tenant_id,summary_date" }
    );

  return { tenant: tenantId, open: open.length };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const geminiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!geminiKey) throw new Error("GOOGLE_API_KEY não configurada");

    // Opcional: { tenant_id } para rodar um tenant específico; senão, todos ativos.
    let only: string | null = null;
    try {
      const body = await req.json();
      only = body?.tenant_id ?? null;
    } catch {
      only = null;
    }

    let q = supabase.from("tenant_config").select("subdomain, name").eq("active", true);
    if (only) q = q.eq("subdomain", only);
    const { data: tenants } = await q;

    const results = [];
    for (const t of tenants || []) {
      try {
        results.push(await summarizeTenant(supabase, geminiKey, t.subdomain, t.name || t.subdomain));
      } catch (err) {
        console.error(`Erro no tenant ${t.subdomain}:`, err);
        results.push({ tenant: t.subdomain, error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("bant-daily-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
