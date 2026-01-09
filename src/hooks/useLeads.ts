import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead, PipelineStage, Tag, Activity, StageHistory } from '@/types/leads';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total: 0,
    newToday: 0,
    qualified: 0,
    unviewed: 0,
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchLeads = useCallback(async (filters?: {
    search?: string;
    status?: string;
    source?: string;
    stage?: string;
    assignedTo?: string;
  }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select(`
          *,
          assigned_user:profiles!leads_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`company_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.source && filters.source !== 'all') {
        query = query.eq('source', filters.source);
      }
      if (filters?.stage && filters.stage !== 'all') {
        query = query.eq('stage', filters.stage);
      }
      if (filters?.assignedTo && filters.assignedTo !== 'all') {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch tags for leads
      if (data && data.length > 0) {
        const leadIds = data.map(l => l.id);
        const { data: leadTags } = await supabase
          .from('lead_tags')
          .select('lead_id, tag_id, tags(*)')
          .in('lead_id', leadIds);

        const leadsWithTags = data.map(lead => ({
          ...lead,
          tags: leadTags
            ?.filter(lt => lt.lead_id === lead.id)
            .map(lt => lt.tags as unknown as Tag) || []
        }));

        setLeads(leadsWithTags as Lead[]);
      } else {
        setLeads([]);
      }
    } catch (error: unknown) {
      console.error('Error fetching leads:', error);
      toast({
        title: 'Erro ao carregar leads',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchStages = useCallback(async () => {
    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('stage_order', { ascending: true });

    if (error) {
      console.error('Error fetching stages:', error);
      return;
    }
    setStages(data as PipelineStage[]);
  }, []);

  const fetchTags = useCallback(async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching tags:', error);
      return;
    }
    setTags(data as Tag[]);
  }, []);

  const fetchMetrics = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalRes, newTodayRes, qualifiedRes, unviewedRes] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('leads').select('*', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', today.toISOString()),
      supabase.from('leads').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'qualificado'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).is('deleted_at', null).is('viewed_at', null),
    ]);

    setMetrics({
      total: totalRes.count || 0,
      newToday: newTodayRes.count || 0,
      qualified: qualifiedRes.count || 0,
      unviewed: unviewedRes.count || 0,
    });
  }, []);

  const createLead = useCallback(async (leadData: {
    company_name: string;
    phone: string;
    [key: string]: unknown;
  }) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          company_name: leadData.company_name,
          phone: leadData.phone,
          cnpj: leadData.cnpj as string | undefined,
          segment: leadData.segment as string | undefined,
          contact_name: leadData.contact_name as string | undefined,
          position: leadData.position as string | undefined,
          email: leadData.email as string | undefined,
          website: leadData.website as string | undefined,
          instagram: leadData.instagram as string | undefined,
          needs: leadData.needs as string | undefined,
          estimated_value: leadData.estimated_value as number | undefined,
          assigned_to: leadData.assigned_to as string | undefined,
          assigned_at: leadData.assigned_at as string | undefined,
          source: (leadData.source as string) || 'manual',
          status: (leadData.status as string) || 'novo',
          stage: (leadData.stage as string) || 'Contato Inicial',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Lead criado!',
        description: `${leadData.company_name} foi adicionado ao funil.`,
      });

      return data;
    } catch (error: unknown) {
      console.error('Error creating lead:', error);
      toast({
        title: 'Erro ao criar lead',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  const updateLead = useCallback(async (id: string, updates: Record<string, unknown>) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Lead atualizado!',
      });

      return data;
    } catch (error: unknown) {
      console.error('Error updating lead:', error);
      toast({
        title: 'Erro ao atualizar lead',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const updateLeadStage = useCallback(async (leadId: string, fromStage: string, toStage: string) => {
    try {
      // Check if moving to "Ganho" stage
      const { data: targetStage } = await supabase
        .from('pipeline_stages')
        .select('is_closed_won')
        .eq('name', toStage)
        .single();

      // Update lead
      const { error: updateError } = await supabase
        .from('leads')
        .update({ stage: toStage })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // Add to history
      await supabase.from('stage_history').insert({
        lead_id: leadId,
        from_stage: fromStage,
        to_stage: toStage,
        changed_by: user?.id,
      });

      // If moving to "Ganho" and lead has a deal, create customer
      if (targetStage?.is_closed_won) {
        const { data: deal } = await supabase
          .from('deals')
          .select('id, total_value, recurring_value')
          .eq('lead_id', leadId)
          .eq('status', 'open')
          .single();

        if (deal) {
          // Mark deal as won
          await supabase
            .from('deals')
            .update({
              status: 'won',
              stage: 'ganho',
              actual_close_date: new Date().toISOString().split('T')[0],
              closed_at: new Date().toISOString(),
              probability: 100,
            })
            .eq('id', deal.id);

          // Get lead data to create customer
          const { data: lead } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

          if (lead) {
            // Check if customer already exists for this lead
            const { data: existingCustomer } = await supabase
              .from('customers')
              .select('id')
              .eq('lead_id', leadId)
              .single();

            if (!existingCustomer) {
              // Create customer from lead
              const { error: customerError } = await supabase
                .from('customers')
                .insert({
                  company_name: lead.company_name,
                  trading_name: lead.trading_name,
                  cnpj: lead.cnpj,
                  contact_name: lead.contact_name || lead.company_name,
                  position: lead.position,
                  phone: lead.phone,
                  email: lead.email || '',
                  website: lead.website,
                  instagram: lead.instagram,
                  segment: lead.segment,
                  company_size: lead.company_size,
                  employee_count: lead.employee_count,
                  lead_id: leadId,
                  deal_id: deal.id,
                  status: 'active',
                  customer_since: new Date().toISOString().split('T')[0],
                  monthly_value: deal.recurring_value || 0,
                  created_by: user?.id,
                });

              if (customerError) {
                console.error('Error creating customer:', customerError);
              } else {
                toast({
                  title: '🎉 Cliente criado!',
                  description: `${lead.company_name} foi convertido em cliente automaticamente.`,
                });
              }
            }
          }
        }
      }

      toast({
        title: 'Lead movido!',
        description: `Movido para ${toStage}`,
      });

      return true;
    } catch (error: unknown) {
      console.error('Error updating stage:', error);
      toast({
        title: 'Erro ao mover lead',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast]);

  const deleteLead = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Lead excluído!',
      });

      return true;
    } catch (error: unknown) {
      console.error('Error deleting lead:', error);
      toast({
        title: 'Erro ao excluir lead',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const addTagToLead = useCallback(async (leadId: string, tagId: string) => {
    try {
      const { error } = await supabase
        .from('lead_tags')
        .insert({ lead_id: leadId, tag_id: tagId });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding tag:', error);
      return false;
    }
  }, []);

  const removeTagFromLead = useCallback(async (leadId: string, tagId: string) => {
    try {
      const { error } = await supabase
        .from('lead_tags')
        .delete()
        .eq('lead_id', leadId)
        .eq('tag_id', tagId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing tag:', error);
      return false;
    }
  }, []);

  const markAsViewed = useCallback(async (id: string) => {
    try {
      await supabase
        .from('leads')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', id)
        .is('viewed_at', null);
    } catch (error) {
      console.error('Error marking as viewed:', error);
    }
  }, []);

  const importLeads = useCallback(async (leadsData: Array<{
    company_name: string;
    phone: string;
    email?: string;
    contact_name?: string;
    position?: string;
    segment?: string;
  }>) => {
    try {
      const formattedLeads = leadsData.map(lead => ({
        company_name: lead.company_name,
        phone: lead.phone,
        email: lead.email || null,
        contact_name: lead.contact_name || null,
        position: lead.position || null,
        segment: lead.segment || null,
        source: 'csv_import',
        status: 'novo',
        stage: 'Contato Inicial',
        created_by: user?.id,
      }));

      const { data, error } = await supabase
        .from('leads')
        .insert(formattedLeads)
        .select();

      if (error) throw error;

      toast({
        title: 'Importação concluída!',
        description: `${data.length} leads importados com sucesso.`,
      });

      return data;
    } catch (error: unknown) {
      console.error('Error importing leads:', error);
      toast({
        title: 'Erro ao importar leads',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  useEffect(() => {
    fetchLeads();
    fetchStages();
    fetchTags();
    fetchMetrics();
  }, [fetchLeads, fetchStages, fetchTags, fetchMetrics]);

  return {
    leads,
    stages,
    tags,
    loading,
    metrics,
    fetchLeads,
    fetchMetrics,
    createLead,
    updateLead,
    updateLeadStage,
    deleteLead,
    addTagToLead,
    removeTagFromLead,
    markAsViewed,
    importLeads,
  };
}

export function useLeadActivities(leadId: string | null) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [history, setHistory] = useState<StageHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchActivities = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          created_by_user:profiles!activities_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data as Activity[]);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  const fetchHistory = useCallback(async () => {
    if (!leadId) return;
    try {
      const { data, error } = await supabase
        .from('stage_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setHistory(data as StageHistory[]);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }, [leadId]);

  const createActivity = useCallback(async (activityData: {
    activity_type: string;
    title: string;
    description?: string;
    scheduled_at?: string;
  }) => {
    if (!leadId) return null;
    try {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          lead_id: leadId,
          activity_type: activityData.activity_type,
          title: activityData.title,
          description: activityData.description || null,
          scheduled_at: activityData.scheduled_at || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Atividade adicionada!',
      });

      fetchActivities();
      return data;
    } catch (error: unknown) {
      console.error('Error creating activity:', error);
      toast({
        title: 'Erro ao criar atividade',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return null;
    }
  }, [leadId, user, toast, fetchActivities]);

  useEffect(() => {
    if (leadId) {
      fetchActivities();
      fetchHistory();
    }
  }, [leadId, fetchActivities, fetchHistory]);

  return {
    activities,
    history,
    loading,
    createActivity,
    fetchActivities,
    fetchHistory,
  };
}
