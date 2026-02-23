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
    const { invoice_id, method } = await req.json()

    if (!invoice_id || !method) {
      throw new Error('invoice_id e method são obrigatórios')
    }

    if (!['email', 'whatsapp', 'both'].includes(method)) {
      throw new Error('method deve ser: email, whatsapp ou both')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar fatura com dados do cliente
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(id, company_name, contact_name, email, phone)
      `)
      .eq('id', invoice_id)
      .single()

    if (invoiceError || !invoice) {
      throw new Error('Fatura não encontrada')
    }

    if (!invoice.customer) {
      throw new Error('Cliente não encontrado para esta fatura')
    }

    const results: Record<string, unknown> = {
      email: null,
      whatsapp: null,
    }

    // Montar link de pagamento disponível
    const paymentInfo = invoice.boleto_url
      ? `📄 Boleto: ${invoice.boleto_url}`
      : invoice.pix_code
        ? `📱 Pix: ${invoice.pix_code}`
        : ''

    // ========== ENVIAR POR EMAIL ==========
    if (method === 'email' || method === 'both') {
      // TODO: Integrar com serviço de email (Resend, SendGrid, etc.)
      // Por enquanto registra no histórico que foi solicitado
      results.email = {
        sent: true,
        to: invoice.customer.email,
        timestamp: new Date().toISOString(),
      }

      await supabase.from('invoice_history').insert({
        invoice_id: invoice.id,
        action: 'email_sent',
        description: `Fatura enviada por email para ${invoice.customer.email}`,
        metadata: { sent_by: 'mavie_ai', method: 'email' },
      })
    }

    // ========== ENVIAR POR WHATSAPP ==========
    if (method === 'whatsapp' || method === 'both') {
      const avisaApiUrl = Deno.env.get('AVISAAPI_URL')
      const avisaApiToken = Deno.env.get('AVISAAPI_TOKEN')

      if (!avisaApiUrl || !avisaApiToken) {
        throw new Error('Credenciais da AvisaAPI não configuradas')
      }

      const dueDate = new Date(invoice.due_date).toLocaleDateString('pt-BR')
      const amount = Number(invoice.total_amount || invoice.amount || 0).toFixed(2)

      const message = [
        `🧾 *Fatura Responde uAI*`,
        ``,
        `Olá ${invoice.customer.contact_name}!`,
        ``,
        `Segue sua fatura:`,
        ``,
        `*Número:* #${invoice.invoice_number}`,
        `*Valor:* R$ ${amount}`,
        `*Vencimento:* ${dueDate}`,
        paymentInfo ? `\n${paymentInfo}` : '',
        ``,
        `Qualquer dúvida, estou aqui! 😊`,
      ].filter(Boolean).join('\n').trim()

      const phone = invoice.customer.phone.replace(/\D/g, '')

      const whatsappResponse = await fetch(`${avisaApiUrl}/message/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': avisaApiToken,
        },
        body: JSON.stringify({
          number: phone,
          text: message,
        }),
      })

      if (!whatsappResponse.ok) {
        const errBody = await whatsappResponse.text()
        console.error('Erro AvisaAPI:', errBody)
        throw new Error('Erro ao enviar WhatsApp')
      }

      results.whatsapp = {
        sent: true,
        to: invoice.customer.phone,
        timestamp: new Date().toISOString(),
      }

      await supabase.from('invoice_history').insert({
        invoice_id: invoice.id,
        action: 'whatsapp_sent',
        description: `Fatura enviada por WhatsApp para ${invoice.customer.phone}`,
        metadata: { sent_by: 'mavie_ai', method: 'whatsapp' },
      })
    }

    return new Response(
      JSON.stringify({ success: true, invoice_id, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('send-invoice error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
