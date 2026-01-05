import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTasks } from "@/hooks/useTasks";
import { useLeads } from "@/hooks/useLeads";
import { useCustomers } from "@/hooks/useCustomers";
import { useDeals } from "@/hooks/useDeals";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { TaskPriority } from "@/types/tasks";

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLeadId?: string;
  defaultCustomerId?: string;
  defaultDealId?: string;
}

export function NewTaskDialog({
  open,
  onOpenChange,
  defaultLeadId,
  defaultCustomerId,
  defaultDealId,
}: NewTaskDialogProps) {
  const { createTask } = useTasks();
  const { leads } = useLeads();
  const { customers } = useCustomers();
  const { deals } = useDeals();
  const { user } = useAuth();

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    task_type: "",
    priority: "medium" as TaskPriority,
    assigned_to: user?.id || "",
    due_date: "",
    due_time: "",
    reminder_enabled: false,
    is_recurring: false,
    recurrence_pattern: "weekly",
    relation_type: defaultLeadId ? "lead" : defaultCustomerId ? "customer" : defaultDealId ? "deal" : "none",
    lead_id: defaultLeadId || "",
    customer_id: defaultCustomerId || "",
    deal_id: defaultDealId || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createTask.mutateAsync({
      title: formData.title,
      description: formData.description || undefined,
      task_type: formData.task_type || undefined,
      priority: formData.priority,
      assigned_to: formData.assigned_to || undefined,
      due_date: formData.due_date || undefined,
      due_time: formData.due_time || undefined,
      reminder_enabled: formData.reminder_enabled,
      is_recurring: formData.is_recurring,
      recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : undefined,
      lead_id: formData.relation_type === "lead" ? formData.lead_id : undefined,
      customer_id: formData.relation_type === "customer" ? formData.customer_id : undefined,
      deal_id: formData.relation_type === "deal" ? formData.deal_id : undefined,
    });

    setFormData({
      title: "",
      description: "",
      task_type: "",
      priority: "medium",
      assigned_to: user?.id || "",
      due_date: "",
      due_time: "",
      reminder_enabled: false,
      is_recurring: false,
      recurrence_pattern: "weekly",
      relation_type: "none",
      lead_id: "",
      customer_id: "",
      deal_id: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Ligar para cliente"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalhes da tarefa..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="task_type">Tipo</Label>
              <Select
                value={formData.task_type}
                onValueChange={(value) => setFormData({ ...formData, task_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Ligação</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="general">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Prioridade *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as TaskPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Relacionado a</Label>
            <Tabs
              value={formData.relation_type}
              onValueChange={(value) => setFormData({ ...formData, relation_type: value })}
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="none">Nenhum</TabsTrigger>
                <TabsTrigger value="lead">Lead</TabsTrigger>
                <TabsTrigger value="customer">Cliente</TabsTrigger>
                <TabsTrigger value="deal">Proposta</TabsTrigger>
              </TabsList>
              <TabsContent value="lead" className="mt-2">
                <Select
                  value={formData.lead_id}
                  onValueChange={(value) => setFormData({ ...formData, lead_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
              <TabsContent value="customer" className="mt-2">
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
              <TabsContent value="deal" className="mt-2">
                <Select
                  value={formData.deal_id}
                  onValueChange={(value) => setFormData({ ...formData, deal_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma proposta" />
                  </SelectTrigger>
                  <SelectContent>
                    {deals.map((deal) => (
                      <SelectItem key={deal.id} value={deal.id}>
                        {deal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
            </Tabs>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assigned_to">Responsável</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="due_date">Vencimento</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="reminder"
              checked={formData.reminder_enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, reminder_enabled: checked as boolean })
              }
            />
            <Label htmlFor="reminder" className="font-normal">
              Lembrete 30 minutos antes
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_recurring"
              checked={formData.is_recurring}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_recurring: checked as boolean })
              }
            />
            <Label htmlFor="is_recurring" className="font-normal">
              Tarefa recorrente
            </Label>
          </div>

          {formData.is_recurring && (
            <div className="pl-6">
              <Label htmlFor="recurrence">Repetir</Label>
              <Select
                value={formData.recurrence_pattern}
                onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diariamente</SelectItem>
                  <SelectItem value="weekly">Semanalmente</SelectItem>
                  <SelectItem value="monthly">Mensalmente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C42]"
              disabled={createTask.isPending}
            >
              {createTask.isPending ? "Criando..." : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
