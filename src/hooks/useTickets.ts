import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Ticket, TicketCategory, TicketMessage, QuickReply } from '@/types/tickets';

export function useTickets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const ticketsQuery = useQuery({
    queryKey: ['tickets'],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          category:ticket_categories(*),
          customer:customers(id, company_name, contact_name),
          assigned_user:profiles!tickets_assigned_to_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Ticket[];
    },
    enabled: !!user,
  });

  const categoriesQuery = useQuery({
    queryKey: ['ticket_categories'],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_categories')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data as TicketCategory[];
    },
    enabled: !!user,
  });

  const quickRepliesQuery = useQuery({
    queryKey: ['quick_replies'],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quick_replies')
        .select('*')
        .eq('active', true)
        .order('title');

      if (error) throw error;
      return data as QuickReply[];
    },
    enabled: !!user,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (ticket: {
      subject: string;
      description: string;
      customer_id: string;
      category_id?: string;
      priority?: string;
      assigned_to?: string;
    }) => {
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          ...ticket,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar ticket: ' + error.message);
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Ticket> & { id: string }) => {
      const { data, error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar ticket: ' + error.message);
    },
  });

  const addMessageMutation = useMutation({
    mutationFn: async (message: {
      ticket_id: string;
      message: string;
      is_internal?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .insert({
          ...message,
          created_by: user?.id,
          is_customer: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket_messages', variables.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Mensagem enviada!');
    },
    onError: (error) => {
      toast.error('Erro ao enviar mensagem: ' + error.message);
    },
  });

  return {
    tickets: ticketsQuery.data || [],
    categories: categoriesQuery.data || [],
    quickReplies: quickRepliesQuery.data || [],
    isLoading: ticketsQuery.isLoading,
    createTicket: createTicketMutation.mutateAsync,
    updateTicket: updateTicketMutation.mutateAsync,
    addMessage: addMessageMutation.mutateAsync,
    refetch: ticketsQuery.refetch,
  };
}

export function useTicketMessages(ticketId: string | null) {
  return useQuery({
    queryKey: ['ticket_messages', ticketId],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async () => {
      if (!ticketId) return [];
      
      const { data, error } = await supabase
        .from('ticket_messages')
        .select(`
          *,
          created_by_user:profiles!ticket_messages_created_by_fkey(id, full_name)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TicketMessage[];
    },
    enabled: !!ticketId,
  });
}
