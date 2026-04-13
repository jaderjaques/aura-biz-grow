import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentProfile } from "@/lib/tenant-utils";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { User, Calendar, Stethoscope } from "lucide-react";
import { ProfessionalWithProfile } from "@/types/professionals";
import { ClinicProcedure } from "@/types/treatmentPlans";

interface Consultorio {
  id: string;
  name: string;
  active: boolean;
}

interface PatientOption {
  id: string;
  full_name: string | null;
  phone?: string | null;
}

interface Props {
  appointment?: any;
  defaultProfessionalId?: string;
  defaultConsultorioId?: string;
  defaultDate?: Date;
  professionals: ProfessionalWithProfile[];
  patients: PatientOption[];
  procedures: ClinicProcedure[];
  onClose: () => void;
}

export function ClinicAgendamentoForm({
  appointment,
  defaultProfessionalId,
  defaultConsultorioId,
  defaultDate,
  professionals,
  patients,
  procedures,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!appointment;

  const [patientId, setPatientId] = useState(appointment?.patient_id ?? "none");
  const [professionalId, setProfessionalId] = useState(
    appointment?.professional_id ?? defaultProfessionalId ?? "none"
  );
  const [procedureId, setProcedureId] = useState(appointment?.procedure_id ?? "none");
  const [consultorioId, setConsultorioId] = useState(
    appointment?.consultorio_id ?? defaultConsultorioId ?? "none"
  );
  const [scheduledFor, setScheduledFor] = useState(
    appointment?.scheduled_for
      ? format(new Date(appointment.scheduled_for), "yyyy-MM-dd'T'HH:mm")
      : defaultDate
      ? format(defaultDate, "yyyy-MM-dd'T'HH:mm")
      : ""
  );
  const [duration, setDuration] = useState(appointment?.duration_minutes ?? 60);
  const [status, setStatus] = useState(appointment?.status ?? "scheduled");
  const [notes, setNotes] = useState(appointment?.internal_notes ?? "");

  // Fetch consultorios ativos
  const { data: consultorios = [] } = useQuery<Consultorio[]>({
    queryKey: ["consultorios"],
    queryFn: async () => {
      const { data } = await supabase
        .from("consultorios")
        .select("id, name, active")
        .eq("active", true)
        .order("name");
      return data ?? [];
    },
  });

  // Auto-fill duration from procedure
  useEffect(() => {
    if (procedureId && procedureId !== "none") {
      const proc = procedures.find((p) => p.id === procedureId);
      if (proc?.duration_minutes) setDuration(proc.duration_minutes);
    }
  }, [procedureId, procedures]);

  // Auto-fill duration from professional default when no procedure
  useEffect(() => {
    if ((!procedureId || procedureId === "none") && professionalId && professionalId !== "none") {
      const prof = professionals.find((p) => p.id === professionalId);
      if (prof?.default_appointment_duration) {
        setDuration(prof.default_appointment_duration);
      }
    }
  }, [professionalId, procedures]);

  const mutation = useMutation({
    mutationFn: async () => {
      const patient = patients.find((p) => p.id === patientId);
      const proc = procedures.find((p) => p.id === procedureId);
      const consult = consultorios.find((c) => c.id === consultorioId);

      const payload: Record<string, any> = {
        patient_id: patientId === "none" ? null : patientId || null,
        professional_id: professionalId === "none" ? null : professionalId || null,
        procedure_id: procedureId === "none" ? null : procedureId || null,
        consultorio_id: consultorioId === "none" ? null : consultorioId || null,
        room: consult?.name ?? null,
        scheduled_for: scheduledFor,
        duration_minutes: duration,
        status,
        internal_notes: notes || null,
        appointment_type: proc?.category ?? "consultation",
        client_name: patient?.full_name ?? "",
        client_phone: patient?.phone ?? "",
        title: `${patient?.full_name ?? "Paciente"} — ${proc?.name ?? "Consulta"}`,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("appointments")
          .update(payload)
          .eq("id", appointment.id);
        if (error) throw error;
      } else {
        const profile = await getCurrentProfile();
        const { error } = await supabase
          .from("appointments")
          .insert([{ ...payload, tenant_id: profile.tenant_id } as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-appointments"] });
      toast.success(isEdit ? "Agendamento atualizado!" : "Agendamento criado!");
      onClose();
    },
    onError: () => toast.error("Erro ao salvar agendamento"),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", appointment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-appointments"] });
      toast.success("Agendamento cancelado!");
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Paciente */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4" />
              Paciente
            </div>
            <Separator />
            <div className="space-y-1">
              <Label>Paciente *</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Selecione o paciente —</SelectItem>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                      {p.phone && (
                        <span className="text-muted-foreground ml-2 text-xs">{p.phone}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Consulta */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Stethoscope className="h-4 w-4" />
              Consulta
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Profissional *</Label>
                <Select value={professionalId} onValueChange={setProfessionalId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Selecione o profissional —</SelectItem>
                    {professionals.filter((p) => p.active).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.profile?.full_name ?? "Profissional"}
                        {p.license_number && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            {p.license_type} {p.license_number}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1">
                <Label>Procedimento (opcional)</Label>
                <Select value={procedureId} onValueChange={setProcedureId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o procedimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Consulta geral —</SelectItem>
                    {procedures.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.duration_minutes && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            {p.duration_minutes} min
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1">
                <Label>Consultório</Label>
                <Select value={consultorioId} onValueChange={setConsultorioId}>
                  <SelectTrigger>
                    <SelectValue placeholder={consultorios.length === 0 ? "Nenhum consultório cadastrado" : "Selecione o consultório"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sem consultório —</SelectItem>
                    {consultorios.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Data/hora */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4" />
              Data e Horário
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data e hora *</Label>
                <Input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="in_progress">Em atendimento</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                    <SelectItem value="no_show">Não compareceu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <Label>Observações internas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações sobre a consulta..."
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          {isEdit && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm("Cancelar este agendamento?")) cancelMutation.mutate();
              }}
              disabled={cancelMutation.isPending}
            >
              Cancelar Agendamento
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !patientId || patientId === "none" || !professionalId || professionalId === "none" || !scheduledFor}
            >
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
