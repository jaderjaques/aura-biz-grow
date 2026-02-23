import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { X, Calendar, Clock, User, MapPin, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  client_name: z.string().min(1, "Nome obrigatório"),
  client_email: z.string().email("Email inválido").optional().or(z.literal("")),
  client_phone: z.string().optional(),
  company_name: z.string().optional(),
  appointment_type: z.string().min(1, "Tipo obrigatório"),
  scheduled_for: z.string().min(1, "Data obrigatória"),
  duration_minutes: z.coerce.number().min(15, "Mínimo 15 minutos"),
  location_type: z.string(),
  meeting_link: z.string().optional(),
  physical_address: z.string().optional(),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  status: z.string(),
  title: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AgendamentoFormProps {
  appointment?: any;
  onClose: () => void;
}

export function AgendamentoForm({ appointment, onClose }: AgendamentoFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!appointment;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_name: appointment?.client_name || "",
      client_email: appointment?.client_email || "",
      client_phone: appointment?.client_phone || "",
      company_name: appointment?.company_name || "",
      appointment_type: appointment?.appointment_type || "demo",
      scheduled_for: appointment?.scheduled_for
        ? format(new Date(appointment.scheduled_for), "yyyy-MM-dd'T'HH:mm")
        : "",
      duration_minutes: appointment?.duration_minutes || 45,
      location_type: appointment?.location_type || "online",
      meeting_link: appointment?.meeting_link || "",
      physical_address: appointment?.physical_address || "",
      description: appointment?.description || "",
      assigned_to: appointment?.assigned_to || "",
      status: appointment?.status || "scheduled",
      title: appointment?.title || "",
    },
  });

  const locationType = watch("location_type");

  const { data: users } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      return data || [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Record<string, any> = {
        client_name: values.client_name,
        client_email: values.client_email || null,
        client_phone: values.client_phone || null,
        company_name: values.company_name || null,
        appointment_type: values.appointment_type,
        scheduled_for: values.scheduled_for,
        duration_minutes: values.duration_minutes,
        location_type: values.location_type,
        meeting_link: values.meeting_link || null,
        physical_address: values.physical_address || null,
        description: values.description || null,
        assigned_to: values.assigned_to || null,
        status: values.status,
        title: values.title || `${values.appointment_type} - ${values.client_name}`,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("appointments")
          .update(payload)
          .eq("id", appointment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("appointments")
          .insert([payload as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(isEdit ? "Agendamento atualizado!" : "Agendamento criado!");
      onClose();
    },
    onError: () => {
      toast.error("Erro ao salvar agendamento");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", appointment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Agendamento cancelado!");
      onClose();
    },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Cliente */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <User className="h-4 w-4" />
              Informações do Cliente
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome do Cliente *</Label>
                <Input {...register("client_name")} placeholder="Nome completo" />
                {errors.client_name && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.client_name.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Empresa</Label>
                <Input {...register("company_name")} placeholder="Empresa" />
              </div>
              <div>
                <Label>Email</Label>
                <Input {...register("client_email")} type="email" placeholder="email@empresa.com" />
              </div>
              <div className="col-span-2">
                <Label>Telefone</Label>
                <Input {...register("client_phone")} placeholder="(14) 99808-5770" />
              </div>
            </div>
          </div>

          {/* Detalhes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Calendar className="h-4 w-4" />
              Detalhes do Agendamento
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo *</Label>
                <Select
                  value={watch("appointment_type")}
                  onValueChange={(v) => setValue("appointment_type", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="demo">Demo</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="consultation">Consultoria</SelectItem>
                    <SelectItem value="presentation">Apresentação</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                    <SelectItem value="no_show">Não Compareceu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data e Hora *</Label>
                <Input {...register("scheduled_for")} type="datetime-local" />
                {errors.scheduled_for && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.scheduled_for.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Duração (min)</Label>
                <Input {...register("duration_minutes")} type="number" min={15} step={15} />
              </div>
              <div>
                <Label>Responsável</Label>
                <Select
                  value={watch("assigned_to") || ""}
                  onValueChange={(v) => setValue("assigned_to", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Local</Label>
                <Select
                  value={locationType}
                  onValueChange={(v) => setValue("location_type", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online (Google Meet)</SelectItem>
                    <SelectItem value="office">No Escritório</SelectItem>
                    <SelectItem value="client_location">No Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {locationType === "online" ? (
              <div>
                <Label>Link Google Meet</Label>
                <Input {...register("meeting_link")} placeholder="https://meet.google.com/..." />
              </div>
            ) : (
              <div>
                <Label>Endereço</Label>
                <Input {...register("physical_address")} placeholder="Endereço completo" />
              </div>
            )}

            <div>
              <Label>Descrição / Notas</Label>
              <Textarea {...register("description")} placeholder="Detalhes do agendamento..." rows={3} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            {isEdit && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm("Tem certeza que deseja cancelar este agendamento?")) {
                    deleteMutation.mutate();
                  }
                }}
              >
                Cancelar Agendamento
              </Button>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
