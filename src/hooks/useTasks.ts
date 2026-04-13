import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { TaskWithDetails, TaskMetrics, TaskStatus, TaskPriority, ChecklistItem } from "@/types/tasks";
import { getCurrentProfile } from "@/lib/tenant-utils";

interface TaskFilters {
  assignedTo?: string;
  priority?: string;
  dueDate?: string;
  status?: string;
}

export const useTasks = (filters?: TaskFilters) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["tasks", filters],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          lead:leads(id, company_name),
          customer:customers(id, company_name),
          deal:deals(id, title),
          assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url),
          created_by_user:profiles!tasks_created_by_fkey(id, full_name)
        `)
        .neq("status", "cancelled")
        .order("kanban_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filters?.assignedTo && filters.assignedTo !== "all") {
        if (filters.assignedTo === "me" && user?.id) {
          query = query.eq("assigned_to", user.id);
        } else if (filters.assignedTo === "unassigned") {
          query = query.is("assigned_to", null);
        } else {
          query = query.eq("assigned_to", filters.assignedTo);
        }
      }

      if (filters?.priority && filters.priority !== "all") {
        query = query.eq("priority", filters.priority);
      }

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.dueDate && filters.dueDate !== "all") {
        const today = new Date().toISOString().split("T")[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
        const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

        switch (filters.dueDate) {
          case "overdue":
            query = query.lt("due_date", today).neq("status", "done");
            break;
          case "today":
            query = query.eq("due_date", today);
            break;
          case "tomorrow":
            query = query.eq("due_date", tomorrow);
            break;
          case "this_week":
            query = query.gte("due_date", today).lte("due_date", weekEnd);
            break;
          case "no_date":
            query = query.is("due_date", null);
            break;
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform data to match TaskWithDetails type
      return (data || []).map((task) => ({
        ...task,
        checklist: Array.isArray(task.checklist) 
          ? (task.checklist as unknown as ChecklistItem[])
          : null,
        attachments: task.attachments as unknown as Record<string, unknown>[] | null,
        recurrence_config: task.recurrence_config as Record<string, unknown> | null,
      })) as unknown as TaskWithDetails[];
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ["task-metrics", user?.id],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async (): Promise<TaskMetrics> => {
      const today = new Date().toISOString().split("T")[0];

      const { data: allTasks } = await supabase
        .from("tasks")
        .select("id, status, due_date, assigned_to, completed_at")
        .neq("status", "cancelled");

      const tasksArr = allTasks || [];

      const myTasks = tasksArr.filter(
        (t) => t.assigned_to === user?.id && t.status !== "done"
      ).length;

      const dueToday = tasksArr.filter(
        (t) => t.due_date === today && t.status !== "done"
      ).length;

      const overdue = tasksArr.filter(
        (t) => t.due_date && t.due_date < today && t.status !== "done"
      ).length;

      const completedToday = tasksArr.filter((t) => {
        if (t.status !== "done" || !t.completed_at) return false;
        const completedDate = new Date(t.completed_at).toISOString().split("T")[0];
        return completedDate === today;
      }).length;

      return { myTasks, dueToday, overdue, completedToday };
    },
    enabled: !!user?.id,
  });

  const createTask = useMutation({
    mutationFn: async (task: {
      title: string;
      description?: string;
      lead_id?: string;
      customer_id?: string;
      deal_id?: string;
      assigned_to?: string;
      priority?: TaskPriority;
      task_type?: string;
      due_date?: string;
      due_time?: string;
      reminder_enabled?: boolean;
      is_recurring?: boolean;
      recurrence_pattern?: string;
      checklist?: ChecklistItem[];
    }) => {
      const profile = await getCurrentProfile();

      const { data, error } = await supabase
        .from("tasks")
        .insert([{
          title: task.title,
          description: task.description || null,
          lead_id: task.lead_id || null,
          customer_id: task.customer_id || null,
          deal_id: task.deal_id || null,
          assigned_to: task.assigned_to || profile.id || null,
          priority: task.priority || "medium",
          task_type: task.task_type || null,
          due_date: task.due_date || null,
          due_time: task.due_time || null,
          reminder_enabled: task.reminder_enabled || false,
          is_recurring: task.is_recurring || false,
          recurrence_pattern: task.recurrence_pattern || null,
          checklist: task.checklist ? JSON.parse(JSON.stringify(task.checklist)) : null,
          status: "todo",
          created_by: profile.id,
          tenant_id: profile.tenant_id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-metrics"] });
      toast({ title: "Tarefa criada!", description: "A tarefa foi adicionada com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar tarefa", description: error.message, variant: "destructive" });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, title, description, priority, status, task_type, due_date, assigned_to, checklist }: { 
      id: string;
      title?: string;
      description?: string;
      priority?: string;
      status?: string;
      task_type?: string;
      due_date?: string;
      assigned_to?: string;
      checklist?: ChecklistItem[];
    }) => {
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (priority !== undefined) updates.priority = priority;
      if (status !== undefined) updates.status = status;
      if (task_type !== undefined) updates.task_type = task_type;
      if (due_date !== undefined) updates.due_date = due_date;
      if (assigned_to !== undefined) updates.assigned_to = assigned_to;
      if (checklist !== undefined) updates.checklist = checklist;
      
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-metrics"] });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar tarefa", description: error.message, variant: "destructive" });
    },
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status, kanban_order }: { id: string; status: TaskStatus; kanban_order?: number }) => {
      const updates: Record<string, unknown> = { status };
      if (kanban_order !== undefined) updates.kanban_order = kanban_order;
      
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      if (data.status === "done") {
        toast({ title: "Tarefa concluída!", description: "A tarefa foi marcada como concluída." });
      }
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-metrics"] });
      toast({ title: "Tarefa excluída" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir tarefa", description: error.message, variant: "destructive" });
    },
  });

  return {
    tasks,
    isLoading,
    metrics,
    refetch,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
  };
};

export const useActivities = (filters?: { leadId?: string; customerId?: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activities", filters],
    staleTime: 30000,
    gcTime: 300000,
    queryFn: async () => {
      let query = supabase
        .from("activities")
        .select(`
          *,
          lead:leads(id, company_name),
          customer:customers(id, company_name),
          deal:deals(id, title),
          task:tasks(id, title),
          created_by_user:profiles!activities_created_by_fkey(id, full_name, avatar_url)
        `)
        .order("activity_date", { ascending: false });

      if (filters?.leadId) {
        query = query.eq("lead_id", filters.leadId);
      }
      if (filters?.customerId) {
        query = query.eq("customer_id", filters.customerId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
  });

  const createActivity = useMutation({
    mutationFn: async (activity: {
      lead_id?: string;
      customer_id?: string;
      deal_id?: string;
      activity_type: string;
      title: string;
      description?: string;
      outcome?: string;
      duration_minutes?: number;
      next_action?: string;
      next_action_date?: string;
    }) => {
      const profile = await getCurrentProfile();

      const { data, error } = await supabase
        .from("activities")
        .insert({
          lead_id: activity.lead_id || null,
          customer_id: activity.customer_id || null,
          deal_id: activity.deal_id || null,
          activity_type: activity.activity_type,
          title: activity.title,
          description: activity.description || null,
          outcome: activity.outcome || null,
          duration_minutes: activity.duration_minutes || null,
          next_action: activity.next_action || null,
          next_action_date: activity.next_action_date || null,
          activity_date: new Date().toISOString(),
          created_by: profile.id,
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Atividade registrada!", description: "A atividade foi adicionada ao histórico." });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar atividade", description: error.message, variant: "destructive" });
    },
  });

  return { activities, isLoading, createActivity };
};
