import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lead, PipelineStage, Tag, Activity, StageHistory } from '@/types/leads';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getCurrentProfile } from '@/lib/tenant-utils';

const LEADS_KEY   = ['leads'];
const STAGES_KEY  = ['pipeline-stages'];
const TAGS_KEY    = ['lead-tags-all'];

// ── query helpers ─────────────────────────────────────────────────────────────

async function fetchLeadsQuery(filters?: {
  search?: string; status?: string; source?: string;
  stage?: string; assignedTo?: string;
}): Promise<Lead[]> {
  let query = supabase
    .from('leads')
    .select(`*, assigned_user:profiles!leads_assigned_to_fkey(id, full_name, avatar_url)`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters?.search)    query = query.or(`company_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  if (filters?.status  && filters.status   !== 'all') query = query.eq('status',      filters.status);
  if (filters?.source  && filters.source   !== 'all') query = query.eq('source',      filters.source);
  if (filters?.stage   && filters.stage    !== 'all') query = query.eq('stage',       filters.stage);
  if (filters?.assignedTo && filters.assignedTo !== 'all') query = query.eq('assigned_to', filters.assignedTo);

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Busca tags em paralelo
  const leadIds = data.map(l => l.id);
  const { data: leadTags } = await supabase
    .from('lead_tags')
    .select('lead_id, tag_id, tags(*)')
    .in('lead_id', leadIds);

  return data.map(lead => ({
    ...lead,
    tags: leadTags?.filter(lt => lt.lead_id === lead.id).map(lt => lt.tags as unknown as Tag) || [],
  })) as Lead[];
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function useLeads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Fase 1: leads recentes (leve, sem joins nem tags) ──────────────────
  const { data: quickLeads = [], isLoading: loadingQuick } = useQuery({
    queryKey: [...LEADS_KEY, 'quick'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, company_name, contact_name, status, stage, source, created_at, assigned_to, email, phone')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(30);
      return (data ?? []) as Partial<Lead>[];
    },
    staleTime: 2 * 60_000,
  });

  // ── Fase 2: leads completos com joins + tags (background) ─────────────
  const { data: fullLeads } = useQuery({
    queryKey: [...LEADS_KEY, 'full'],
    queryFn: () => fetchLeadsQuery(),
    staleTime: 3 * 60_000,
    enabled: !loadingQuick,
  });

  const leads   = (fullLeads ?? quickLeads) as Lead[];
  const loading = loadingQuick;

  // ── Stages com cache longo ─────────────────────────────────────────────
  const { data: stages = [] } = useQuery<PipelineStage[]>({
    queryKey: STAGES_KEY,
    queryFn: async () => {
      const { data } = await supabase.from('pipeline_stages').select('*').order('stage_order', { ascending: true });
      return (data as PipelineStage[]) ?? [];
    },
    staleTime: 10 * 60_000,
  });

  // ── Tags com cache longo ───────────────────────────────────────────────
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: TAGS_KEY,
    queryFn: async () => {
      const { data } = await supabase.from('tags').select('*').order('name', { ascending: true });
      return (data as Tag[]) ?? [];
    },
    staleTime: 10 * 60_000,
  });

  // ── Métricas com cache curto ───────────────────────────────────────────
  const { data: metrics = { total: 0, newToday: 0, qualified: 0, unviewed: 0 } } = useQuery({
    queryKey: [...LEADS_KEY, 'metrics'],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [totalRes, newTodayRes, qualifiedRes, unviewedRes] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('leads').select('*', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', today.toISOString()),
        supabase.from('leads').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'qualificado'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).is('deleted_at', null).is('viewed_at', null),
      ]);
      return {
        total:    totalRes.count    || 0,
        newToday: newTodayRes.count || 0,
        qualified: qualifiedRes.count || 0,
        unviewed: unviewedRes.count  || 0,
      };
    },
    staleTime: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: LEADS_KEY });

  // ── fetchLeads (mantido para compatibilidade — dispara invalidation) ───
  const fetchLeads = useCallback((_filters?: object) => {
    queryClient.invalidateQueries({ queryKey: LEADS_KEY });
  }, [queryClient]);

  const fetchMetrics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'metrics'] });
  }, [queryClient]);

  // ── Criar ────────────────────────────────────────────────────────────────
  const createLead = useCallback(async (leadData: {
    company_name: string; phone: string; [key: string]: unknown;
  }) => {
    try {
      const profile = await getCurrentProfile();
      const { data, error } = await supabase
        .from('leads')
        .insert({
          company_name:    leadData.company_name,
          phone:           leadData.phone,
          cnpj:            leadData.cnpj            as string | undefined,
          segment:         leadData.segment          as string | undefined,
          contact_name:    leadData.contact_name     as string | undefined,
          position:        leadData.position         as string | undefined,
          email:           leadData.email            as string | undefined,
          website:         leadData.website          as string | undefined,
          instagram:       leadData.instagram        as string | undefined,
          needs:           leadData.needs            as string | undefined,
          estimated_value: leadData.estimated_value  as number | undefined,
          assigned_to:     leadData.assigned_to      as string | undefined,
          assigned_at:     leadData.assigned_at      as string | undefined,
          source:          (leadData.source   as string) || 'manual',
          status:          (leadData.status   as string) || 'novo',
          stage:           (leadData.stage    as string) || 'Contato Inicial',
          created_by:      profile.id,
          tenant_id:       profile.tenant_id,
        })
        .select().single();
      if (error) throw error;
      toast({ title: 'Lead criado!', description: `${leadData.company_name} foi adicionado ao funil.` });
      invalidate();
      return data;
    } catch (error: unknown) {
      toast({ title: 'Erro ao criar lead', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
      return null;
    }
  }, [user, toast, invalidate]);

  // ── Atualizar ────────────────────────────────────────────────────────────
  const updateLead = useCallback(async (id: string, updates: Record<string, unknown>) => {
    try {
      const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
      if (error) throw error;
      toast({ title: 'Lead atualizado!' });
      invalidate();
      return data;
    } catch (error: unknown) {
      toast({ title: 'Erro ao atualizar lead', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
      return null;
    }
  }, [toast, invalidate]);

  // ── Mover estágio ─────────────────────────────────────────────────────────
  const updateLeadStage = useCallback(async (leadId: string, fromStage: string, toStage: string) => {
    try {
      const { data: targetStage } = await supabase.from('pipeline_stages').select('is_closed_won').eq('name', toStage).single();

      await supabase.from('leads').update({ stage: toStage }).eq('id', leadId);
      await supabase.from('stage_history').insert({ lead_id: leadId, from_stage: fromStage, to_stage: toStage, changed_by: user?.id });

      if (targetStage?.is_closed_won) {
        const { data: deal } = await supabase.from('deals').select('id, total_value, recurring_value').eq('lead_id', leadId).eq('status', 'open').single();
        if (deal) {
          await supabase.from('deals').update({ status: 'won', stage: 'ganho', actual_close_date: new Date().toISOString().split('T')[0], closed_at: new Date().toISOString(), probability: 100 }).eq('id', deal.id);
          const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
          if (lead) {
            const { data: existingCustomer } = await supabase.from('customers').select('id').eq('lead_id', leadId).single();
            if (!existingCustomer) {
              const profile = await getCurrentProfile();
              const { error: customerError } = await supabase.from('customers').insert({
                company_name: lead.company_name, trading_name: lead.trading_name, cnpj: lead.cnpj,
                contact_name: lead.contact_name || lead.company_name, position: lead.position,
                phone: lead.phone, email: lead.email || '', website: lead.website, instagram: lead.instagram,
                segment: lead.segment, company_size: lead.company_size, employee_count: lead.employee_count,
                lead_id: leadId, deal_id: deal.id, status: 'active',
                customer_since: new Date().toISOString().split('T')[0],
                monthly_value: deal.recurring_value || 0, created_by: profile.id,
                tenant_id: profile.tenant_id,
              });
              if (!customerError) toast({ title: '🎉 Cliente criado!', description: `${lead.company_name} foi convertido em cliente automaticamente.` });
            }
          }
        }
      }

      toast({ title: 'Lead movido!', description: `Movido para ${toStage}` });
      invalidate();
      return true;
    } catch (error: unknown) {
      toast({ title: 'Erro ao mover lead', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
      return false;
    }
  }, [user, toast, invalidate]);

  // ── Deletar ───────────────────────────────────────────────────────────────
  const deleteLead = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Lead excluído!' });
      invalidate();
      return true;
    } catch (error: unknown) {
      toast({ title: 'Erro ao excluir lead', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
      return false;
    }
  }, [toast, invalidate]);

  // ── Tags ──────────────────────────────────────────────────────────────────
  const addTagToLead = useCallback(async (leadId: string, tagId: string) => {
    try {
      await supabase.from('lead_tags').insert({ lead_id: leadId, tag_id: tagId });
      invalidate();
      return true;
    } catch { return false; }
  }, [invalidate]);

  const removeTagFromLead = useCallback(async (leadId: string, tagId: string) => {
    try {
      await supabase.from('lead_tags').delete().eq('lead_id', leadId).eq('tag_id', tagId);
      invalidate();
      return true;
    } catch { return false; }
  }, [invalidate]);

  // ── Visualização ──────────────────────────────────────────────────────────
  const markAsViewed = useCallback(async (id: string) => {
    try {
      await supabase.from('leads').update({ viewed_at: new Date().toISOString() }).eq('id', id).is('viewed_at', null);
    } catch (error) { console.error('Error marking as viewed:', error); }
  }, []);

  // ── Importar CSV ──────────────────────────────────────────────────────────
  const importLeads = useCallback(async (leadsData: Array<{
    company_name: string; phone: string; email?: string;
    contact_name?: string; position?: string; segment?: string;
  }>) => {
    try {
      const profile = await getCurrentProfile();
      const { data, error } = await supabase.from('leads').insert(
        leadsData.map(l => ({
          company_name: l.company_name, phone: l.phone, email: l.email || null,
          contact_name: l.contact_name || null, position: l.position || null,
          segment: l.segment || null, source: 'csv_import',
          status: 'novo', stage: 'Contato Inicial',
          created_by: profile.id, tenant_id: profile.tenant_id,
        }))
      ).select();
      if (error) throw error;
      toast({ title: 'Importação concluída!', description: `${data.length} leads importados com sucesso.` });
      invalidate();
      return data;
    } catch (error: unknown) {
      toast({ title: 'Erro ao importar leads', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
      return null;
    }
  }, [user, toast, invalidate]);

  return {
    leads, stages, tags, loading, metrics,
    fetchLeads, fetchMetrics,
    createLead, updateLead, updateLeadStage, deleteLead,
    addTagToLead, removeTagFromLead, markAsViewed, importLeads,
  };
}

// ─── useLeadActivities (sem alterações no comportamento) ─────────────────────
export function useLeadActivities(leadId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const ACTS_KEY = ['lead-activities', leadId];

  const { data: activities = [], isLoading: loading } = useQuery<Activity[]>({
    queryKey: ACTS_KEY,
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('activities')
        .select(`*, created_by_user:profiles!activities_created_by_fkey(id, full_name, avatar_url)`)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!leadId,
    staleTime: 60_000,
  });

  const { data: history = [] } = useQuery<StageHistory[]>({
    queryKey: ['lead-history', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase.from('stage_history').select('*').eq('lead_id', leadId).order('changed_at', { ascending: false });
      if (error) throw error;
      return data as StageHistory[];
    },
    enabled: !!leadId,
    staleTime: 60_000,
  });

  const createActivity = useCallback(async (activityData: {
    activity_type: string; title: string; description?: string; scheduled_at?: string;
  }) => {
    if (!leadId) return null;
    try {
      const { data, error } = await supabase.from('activities').insert({
        lead_id: leadId, activity_type: activityData.activity_type, title: activityData.title,
        description: activityData.description || null, scheduled_at: activityData.scheduled_at || null,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      toast({ title: 'Atividade adicionada!' });
      queryClient.invalidateQueries({ queryKey: ACTS_KEY });
      return data;
    } catch (error: unknown) {
      toast({ title: 'Erro ao criar atividade', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
      return null;
    }
  }, [leadId, user, toast, queryClient, ACTS_KEY]);

  const fetchActivities = useCallback(() => queryClient.invalidateQueries({ queryKey: ACTS_KEY }), [queryClient, ACTS_KEY]);
  const fetchHistory    = useCallback(() => queryClient.invalidateQueries({ queryKey: ['lead-history', leadId] }), [queryClient, leadId]);

  return { activities, history, loading, createActivity, fetchActivities, fetchHistory };
}
