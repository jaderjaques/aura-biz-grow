import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log('📩 Webhook recebido:', JSON.stringify(payload, null, 2))

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const {
      remoteJid,
      message,
      messageType,
      fromMe,
      messageId,
      pushName,
      deviceId,
    } = payload

    // Log do webhook recebido
    if (deviceId) {
      await supabase.from('chat_webhook_logs').insert({
        device_id: deviceId,
        event_type: messageType || 'message',
        payload,
        processed: false,
      })
    }

    // Ignorar mensagens enviadas por mim
    if (fromMe) {
      console.log('⏭️ Mensagem enviada por mim, ignorando')
      return new Response(JSON.stringify({ ok: true, skipped: 'fromMe' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!remoteJid) {
      return new Response(JSON.stringify({ error: 'remoteJid is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const phoneNumber = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '')
    const messageContent = message || ''

    // Buscar ou criar chat usando a função do banco
    const { data: chatId } = await supabase.rpc('get_or_create_chat', {
      p_device_id: deviceId || null,
      p_remote_jid: remoteJid,
      p_contact_name: pushName || phoneNumber,
    })

    if (!chatId) {
      throw new Error('Falha ao buscar/criar chat')
    }

    // Reabrir chat se estava arquivado
    await supabase
      .from('chats')
      .update({ status: 'open', archived_at: null })
      .eq('id', chatId)
      .in('status', ['archived', 'closed'])

    // Inserir mensagem (triggers cuidam de atualizar o chat)
    const { error: msgError } = await supabase.from('chat_messages').insert({
      chat_id: chatId,
      message_id: messageId || null,
      direction: 'incoming',
      message_type: messageType || 'text',
      content: messageContent,
      metadata: payload,
    })

    if (msgError) {
      console.error('❌ Erro ao inserir mensagem:', msgError)
      throw msgError
    }

    // Marcar webhook como processado
    if (deviceId) {
      await supabase
        .from('chat_webhook_logs')
        .update({ processed: true })
        .eq('device_id', deviceId)
        .eq('processed', false)
        .order('created_at', { ascending: false })
        .limit(1)
    }

    console.log('✅ Mensagem salva no chat:', chatId)

    return new Response(
      JSON.stringify({ success: true, chat_id: chatId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
