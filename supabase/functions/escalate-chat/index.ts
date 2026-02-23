import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const {
      chat_id,
      reason,
      trigger,
      sentiment_score,
      conversation_summary,
    } = await req.json()

    if (!chat_id || !reason) {
      throw new Error('chat_id e reason são obrigatórios')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar chat com customer
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*, customer:customers(*)')
      .eq('id', chat_id)
      .single()

    if (chatError || !chat) {
      throw new Error('Chat não encontrado')
    }

    // Atualizar chat para modo humano
    const { error: updateError } = await supabase
      .from('chats')
      .update({
        ai_mode: 'paused',
        needs_human: true,
        escalation_reason: reason,
        escalated_at: new Date().toISOString(),
      })
      .eq('id', chat_id)

    if (updateError) {
      console.error('Erro ao atualizar chat:', updateError.message)
    }

    // Registrar no log de escalonamentos
    const { data: logEntry, error: logError } = await supabase
      .from('escalation_logs')
      .insert({
        chat_id,
        reason,
        trigger_type: trigger || null,
        trigger_value: sentiment_score != null ? { sentiment_score } : null,
        ai_last_message: 'Transferindo para atendimento humano...',
        conversation_summary: conversation_summary || null,
      })
      .select('id')
      .single()

    if (logError) {
      console.error('Erro ao criar log de escalonamento:', logError.message)
    }

    // Notificar gestor via WhatsApp
    const gestorPhone = Deno.env.get('GESTOR_WHATSAPP_NUMBER')
    const avisaApiUrl = Deno.env.get('AVISAAPI_URL')
    const avisaApiToken = Deno.env.get('AVISAAPI_TOKEN')
    const crmUrl = Deno.env.get('CRM_URL')

    const reasonLabels: Record<string, string> = {
      customer_request: 'Cliente solicitou atendimento humano',
      negative_sentiment: 'Sentimento muito negativo detectado',
      low_confidence: 'IA não soube responder',
      complex_negotiation: 'Negociação complexa',
      overdue_invoices: 'Cliente inadimplente quer contratar',
      vip_customer: 'Cliente VIP',
    }

    let notificationSent = false

    if (gestorPhone && avisaApiUrl && avisaApiToken) {
      const customer = chat.customer as Record<string, unknown> | null
      const notificationMessage = `
🚨 *ATENDIMENTO NECESSÁRIO*

*Cliente:* ${chat.contact_name || 'N/A'}
*Empresa:* ${customer?.company_name || 'N/A'}
*Telefone:* ${chat.contact_number || 'N/A'}
*Motivo:* ${reasonLabels[reason] || reason}
${conversation_summary ? `\n*Resumo:*\n${conversation_summary}\n` : ''}
*Ação:* Acesse o CRM e assuma a conversa
${crmUrl ? `🔗 ${crmUrl}/inbox?chat=${chat_id}` : ''}
      `.trim()

      try {
        const whatsappRes = await fetch(`${avisaApiUrl}/message/sendText`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: avisaApiToken,
          },
          body: JSON.stringify({
            number: gestorPhone.replace(/\D/g, ''),
            text: notificationMessage,
          }),
        })

        notificationSent = whatsappRes.ok
      } catch (e) {
        console.error('Erro ao enviar WhatsApp:', e.message)
      }

      // Atualizar log com status da notificação
      if (logEntry?.id) {
        await supabase
          .from('escalation_logs')
          .update({
            notification_sent: notificationSent,
            notifications_sent_to: [gestorPhone],
          })
          .eq('id', logEntry.id)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        chat_id,
        escalated: true,
        ai_paused: true,
        notification_sent: notificationSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
