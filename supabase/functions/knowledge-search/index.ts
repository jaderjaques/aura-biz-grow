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
    const { query, sources = ['pdf', 'products', 'faq'], max_results = 3 } = await req.json()

    if (!query) {
      throw new Error('query é obrigatório')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const results: Record<string, unknown[]> = {
      pdf_results: [],
      product_results: [],
      faq_results: [],
    }

    // Buscar em PRODUCTS via RPC existente
    if (sources.includes('products')) {
      const { data: products, error } = await supabase
        .rpc('query_products', {
          p_search: query,
          p_is_active: true,
          p_limit: max_results,
        })

      if (error) {
        console.error('Erro ao buscar produtos:', error.message)
      }
      results.product_results = products || []
    }

    // Buscar em KNOWLEDGE BASE (artigos/PDFs processados)
    if (sources.includes('pdf')) {
      // Buscar nos documentos de IA (PDFs ingeridos)
      const { data: docs, error } = await supabase
        .from('ai_knowledge_documents')
        .select('id, document_name, content_text, metadata')
        .eq('is_active', true)
        .or(`document_name.ilike.%${query}%,content_text.ilike.%${query}%`)
        .limit(max_results)

      if (error) {
        console.error('Erro ao buscar documentos:', error.message)
      }
      results.pdf_results = docs || []
    }

    // Buscar em Knowledge Base (FAQs / artigos)
    if (sources.includes('faq')) {
      const { data: articles, error } = await supabase
        .from('knowledge_base')
        .select('id, title, content, tags')
        .eq('active', true)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(max_results)

      if (error) {
        console.error('Erro ao buscar FAQs:', error.message)
      }
      results.faq_results = articles || []
    }

    return new Response(
      JSON.stringify({ success: true, query, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
