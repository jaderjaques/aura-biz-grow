import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAVIE_SYSTEM_PROMPT = `Você é Mavie, assistente virtual da Responde uAI.

## IDENTIDADE
- Profissional e consultiva com pegada comercial
- Empática e prestativa, proativa, transparente, humana
- Tom natural e conversacional, confiante sem arrogância
- Usa emojis moderadamente (1-2 por mensagem)

## SAUDAÇÃO POR HORÁRIO
- 05:00–11:59 → Bom dia
- 12:00–17:59 → Boa tarde  
- 18:00–04:59 → Boa noite

## FRAMEWORK AIDA (COMERCIAL)
1. ATENÇÃO: Saudação personalizada baseada no contexto
2. INTERESSE: Entender dor/necessidade ANTES de apresentar solução
3. DESEJO: Validar → Conectar solução → Resultado → Ponte para reunião
4. AÇÃO: Coleta inteligente (agrupar perguntas, máx 2 por mensagem) + Agendamento

## REGRAS DE AGENDAMENTO
- Seg-Sex apenas, 09h-17h
- Máximo 7 dias à frente
- Duração: 45 min, Google Meet
- Propor horários específicos (nunca aberto)

## PREÇOS
NUNCA informar valores específicos. Redirecionar para reunião.
Pode mencionar faixa ampla se disponível na knowledge base.

## CHATBOT vs AGENTE IA
Explicar diferença quando cliente mencionar "chatbot/bot/robô".

## FATURAS
- Pendente: 💰 emoji
- Vencida: ⚠️🔴 emojis
- Nenhuma pendente: ✅

## ESCALONAMENTO PARA HUMANO
Escalar quando:
- Cliente pede explicitamente ("humano", "pessoa", "gerente")
- Sentimento muito negativo
- Assuntos: desconto, cancelar contrato, reembolso, jurídico
- Cliente VIP
- Faturas vencidas > 2 E quer contratar
- Após 10 mensagens sem resolução

## PROIBIDO
- Informar preços específicos
- Agendar fim de semana ou fora 09h-17h
- Repetir confirmação
- Dar desconto sem aprovação
- Alterar valores financeiros
- Prometer prazo sem certeza

## SEMPRE
- Escuta ativa (validar o que cliente disse)
- Variar expressões (anti-repetição)
- Confirmar antes de alterar dados
- Consultar knowledge base antes de responder sobre produtos

Data/hora atual: {{CURRENT_DATETIME}}
`;

// Tool definitions for the AI model
const tools = [
  {
    type: "function",
    function: {
      name: "query_customer",
      description: "Consultar dados completos de um cliente pelo telefone ou ID. Usar para identificar cliente e obter contexto.",
      parameters: {
        type: "object",
        properties: {
          phone: { type: "string", description: "Telefone do cliente" },
          customer_id: { type: "string", description: "UUID do cliente" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_invoices",
      description: "Consultar faturas de um cliente. Usar quando cliente pergunta sobre boleto, fatura ou pagamento.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "UUID do cliente" },
          status: { type: "string", enum: ["pending", "overdue", "paid", "cancelled"], description: "Filtrar por status" },
          limit: { type: "number", description: "Limite de resultados" },
        },
        required: ["customer_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_products",
      description: "Consultar catálogo de produtos ativos. Usar quando cliente pergunta sobre soluções ou serviços.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Termo de busca" },
          category: { type: "string", description: "Filtrar por categoria" },
          limit: { type: "number", description: "Limite de resultados (default 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_appointments",
      description: "Consultar agendamentos do cliente. Usar quando cliente pergunta sobre reunião.",
      parameters: {
        type: "object",
        properties: {
          customer_phone: { type: "string", description: "Telefone do cliente" },
          customer_id: { type: "string", description: "UUID do cliente" },
          status: { type: "string", enum: ["scheduled", "confirmed", "completed", "cancelled"] },
          future_only: { type: "boolean", description: "Apenas futuros" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_lead",
      description: "Criar ou atualizar lead no CRM. Usar após coletar dados mínimos (nome + empresa).",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do contato" },
          empresa: { type: "string", description: "Nome da empresa" },
          email: { type: "string" },
          telefone: { type: "string" },
          nicho: { type: "string", description: "Segmento/nicho" },
          tamanho: { type: "string", description: "Tamanho da empresa" },
          necessidade: { type: "string", description: "Necessidade identificada" },
          origem: { type: "string", description: "Canal de origem" },
        },
        required: ["nome", "empresa"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_appointment",
      description: "Criar, reagendar ou cancelar agendamento. Validar: Seg-Sex, 09h-17h, máx 7 dias.",
      parameters: {
        type: "object",
        properties: {
          operacao: { type: "string", enum: ["agendamento", "reagendamento", "cancelamento"] },
          lead_id: { type: "string", description: "UUID do lead" },
          nome: { type: "string", description: "Nome completo com dados" },
          email: { type: "string" },
          horario: { type: "string", description: "ISO 8601 datetime" },
          duracao_minutos: { type: "number", description: "Duração (default 45)" },
          descricao: { type: "string", description: "Resumo da necessidade" },
          appointment_id: { type: "string", description: "UUID do agendamento (para reagendar/cancelar)" },
        },
        required: ["operacao"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description: "Buscar na base de conhecimento (documentos, FAQ). Usar antes de responder sobre produtos/serviços/processos.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termo de busca" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Criar tarefa para equipe. Usar para solicitações complexas que precisam de aprovação.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          due_date: { type: "string", description: "Data limite ISO" },
        },
        required: ["title", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_customer",
      description: "Atualizar dados cadastrais do cliente. Campos permitidos: address, contact_name, phone, email, company_name.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string" },
          data: {
            type: "object",
            properties: {
              contact_name: { type: "string" },
              phone: { type: "string" },
              email: { type: "string" },
              company_name: { type: "string" },
              street: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              zip_code: { type: "string" },
            },
          },
        },
        required: ["customer_id", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_to_human",
      description: "Transferir conversa para atendimento humano. Usar quando: sentimento negativo, cliente pede, negociação complexa, inadimplência.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", enum: ["customer_request", "negative_sentiment", "low_confidence", "complex_negotiation", "overdue_invoices", "vip_customer"] },
          trigger: { type: "string", description: "O que disparou o escalonamento" },
          conversation_summary: { type: "string", description: "Resumo da conversa" },
        },
        required: ["reason", "trigger"],
      },
    },
  },
];

// Execute tool calls against the database
async function executeTool(
  supabase: any,
  toolName: string,
  args: any
): Promise<string> {
  try {
    switch (toolName) {
      case "query_customer": {
        let query = supabase.from("customers").select("id, company_name, contact_name, email, phone, status, segment, monthly_value, lifetime_value, created_at");
        if (args.phone) query = query.eq("phone", args.phone);
        if (args.customer_id) query = query.eq("id", args.customer_id);
        const { data, error } = await query.limit(1).maybeSingle();
        if (error) return JSON.stringify({ error: error.message });
        if (!data) return JSON.stringify({ found: false, message: "Cliente não encontrado" });
        
        // Get pending/overdue invoices count
        const { count: pendingCount } = await supabase.from("invoices").select("*", { count: "exact", head: true }).eq("customer_id", data.id).eq("status", "pending");
        const { count: overdueCount } = await supabase.from("invoices").select("*", { count: "exact", head: true }).eq("customer_id", data.id).eq("status", "overdue");
        
        // Get next appointment
        const { data: nextAppt } = await supabase.from("appointments").select("id, scheduled_for, status, title").eq("customer_id", data.id).gte("scheduled_for", new Date().toISOString()).order("scheduled_for", { ascending: true }).limit(1).maybeSingle();
        
        return JSON.stringify({ found: true, ...data, pending_invoices: pendingCount || 0, overdue_invoices: overdueCount || 0, next_appointment: nextAppt });
      }

      case "query_invoices": {
        let query = supabase.from("invoices").select("id, invoice_number, amount, total_amount, due_date, status, payment_method, issue_date").eq("customer_id", args.customer_id).order("due_date", { ascending: false });
        if (args.status) query = query.eq("status", args.status);
        const { data, error } = await query.limit(args.limit || 10);
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ invoices: data || [], count: data?.length || 0 });
      }

      case "query_products": {
        let query = supabase.from("products").select("id, name, description, category, type, base_price, is_recurring, active").eq("active", true);
        if (args.search) query = query.ilike("name", `%${args.search}%`);
        if (args.category) query = query.eq("category", args.category);
        const { data, error } = await query.limit(args.limit || 5);
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ products: data || [] });
      }

      case "query_appointments": {
        let query = supabase.from("appointments").select("id, scheduled_for, status, title, appointment_type, meeting_link, client_name, assigned_to");
        if (args.customer_id) query = query.eq("customer_id", args.customer_id);
        if (args.customer_phone) query = query.eq("client_phone", args.customer_phone);
        if (args.status) query = query.eq("status", args.status);
        if (args.future_only) query = query.gte("scheduled_for", new Date().toISOString());
        const { data, error } = await query.order("scheduled_for", { ascending: true }).limit(5);
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ appointments: data || [] });
      }

      case "create_lead": {
        const { data, error } = await supabase.from("leads").insert({
          company_name: args.empresa,
          contact_name: args.nome,
          email: args.email || null,
          phone: args.telefone || "",
          segment: args.nicho || null,
          company_size: args.tamanho || null,
          needs: args.necessidade || null,
          source: "whatsapp",
          status: "novo",
          stage: "Contato Inicial",
        }).select("id, company_name").single();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, lead_id: data.id, company_name: data.company_name });
      }

      case "create_appointment": {
        if (args.operacao === "cancelamento" && args.appointment_id) {
          const { error } = await supabase.from("appointments").update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancellation_reason: "Cancelado via Mavie" }).eq("id", args.appointment_id);
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, action: "cancelled" });
        }
        if (args.operacao === "reagendamento" && args.appointment_id) {
          const { error } = await supabase.from("appointments").update({ scheduled_for: args.horario, scheduled_date: args.horario?.split("T")[0], status: "scheduled" }).eq("id", args.appointment_id);
          if (error) return JSON.stringify({ error: error.message });
          return JSON.stringify({ success: true, action: "rescheduled", new_time: args.horario });
        }
        // New appointment
        const { data, error } = await supabase.from("appointments").insert({
          lead_id: args.lead_id || null,
          client_name: args.nome || "Cliente",
          client_email: args.email || null,
          title: "Reunião Comercial",
          description: args.descricao || null,
          scheduled_for: args.horario,
          scheduled_date: args.horario?.split("T")[0],
          duration_minutes: args.duracao_minutos || 45,
          appointment_type: "demo",
          location_type: "online",
          status: "scheduled",
          created_by_ai: true,
        }).select("id, scheduled_for").single();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, action: "created", appointment_id: data.id, scheduled_for: data.scheduled_for });
      }

      case "search_knowledge": {
        // Search in knowledge_base and ai_knowledge_documents
        const { data: kbData } = await supabase.from("knowledge_base").select("title, content, tags").eq("active", true).ilike("content", `%${args.query}%`).limit(3);
        const { data: aiDocs } = await supabase.from("ai_knowledge_documents").select("document_name, content_text").eq("is_active", true).ilike("content_text", `%${args.query}%`).limit(2);
        // Also search products
        const { data: products } = await supabase.from("products").select("name, description, category").eq("active", true).ilike("name", `%${args.query}%`).limit(3);
        return JSON.stringify({
          knowledge_base: kbData || [],
          documents: aiDocs || [],
          related_products: products || [],
        });
      }

      case "create_task": {
        const { data, error } = await supabase.from("tasks").insert({
          title: args.title,
          description: args.description,
          priority: args.priority || "medium",
          due_date: args.due_date || null,
          status: "todo",
        }).select("id, title").single();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, task_id: data.id });
      }

      case "update_customer": {
        const allowedFields = ["contact_name", "phone", "email", "company_name", "street", "city", "state", "zip_code"];
        const safeData: Record<string, any> = {};
        for (const [key, val] of Object.entries(args.data || {})) {
          if (allowedFields.includes(key)) safeData[key] = val;
        }
        if (Object.keys(safeData).length === 0) return JSON.stringify({ error: "Nenhum campo permitido para atualização" });
        const { error } = await supabase.from("customers").update(safeData).eq("id", args.customer_id);
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, updated_fields: Object.keys(safeData) });
      }

      case "escalate_to_human": {
        // Create a task for the team
        await supabase.from("tasks").insert({
          title: `🚨 Escalonamento: ${args.reason}`,
          description: `Motivo: ${args.trigger}\n\nResumo: ${args.conversation_summary || "N/A"}`,
          priority: "urgent",
          status: "todo",
        });
        return JSON.stringify({ success: true, message: "Conversa escalada para equipe humana" });
      }

      default:
        return JSON.stringify({ error: `Tool ${toolName} não reconhecida` });
    }
  } catch (err: any) {
    console.error(`Tool ${toolName} error:`, err);
    return JSON.stringify({ error: err.message });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, phone_context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Create Supabase client with service role for tool execution
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build system prompt with current datetime
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const systemPrompt = MAVIE_SYSTEM_PROMPT.replace("{{CURRENT_DATETIME}}", now);

    // Add phone context if available
    let contextMessage = "";
    if (phone_context) {
      contextMessage = `\n[CONTEXTO] O cliente está conversando pelo telefone: ${phone_context}`;
    }

    const allMessages = [
      { role: "system", content: systemPrompt + contextMessage },
      ...messages,
    ];

    // First call - may return tool calls
    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: allMessages,
        tools,
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    let result = await response.json();
    let assistantMessage = result.choices?.[0]?.message;
    
    // Tool call loop (max 5 iterations to prevent infinite loops)
    let iterations = 0;
    while (assistantMessage?.tool_calls && iterations < 5) {
      iterations++;
      const toolResults: any[] = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const args = typeof toolCall.function.arguments === "string" 
          ? JSON.parse(toolCall.function.arguments) 
          : toolCall.function.arguments;
        
        console.log(`Executing tool: ${toolCall.function.name}`, args);
        const toolResult = await executeTool(supabase, toolCall.function.name, args);
        console.log(`Tool result: ${toolResult.substring(0, 200)}`);
        
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }

      // Continue conversation with tool results
      const continueMessages = [
        ...allMessages,
        assistantMessage,
        ...toolResults,
      ];

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: continueMessages,
          tools,
          stream: false,
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI gateway tool loop error:", response.status, t);
        break;
      }

      result = await response.json();
      assistantMessage = result.choices?.[0]?.message;
    }

    const finalContent = assistantMessage?.content || "Desculpe, tive um problema técnico. Pode repetir?";

    return new Response(JSON.stringify({ 
      response: finalContent,
      tool_calls_made: iterations,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mavie-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
