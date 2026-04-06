import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isSameDay, addMinutes, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { CalendarView } from "@/components/agenda/CalendarView";
import { DayView } from "@/components/agenda/DayView";
import { ClinicAgendamentoForm } from "@/components/agenda/ClinicAgendamentoForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar as CalendarIcon, List, Users } from "lucide-react";
import { useProfessionals } from "@/hooks/useProfessionals";
import { usePatients } from "@/hooks/usePatients";
import { useTreatmentPlans } from "@/hooks/useTreatmentPlans";
import { PROFESSIONAL_COLORS } from "@/types/professionals";

export default function ClinicAgenda() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [filterProfessionalId, setFilterProfessionalId] = useState<string>("all");

  const { professionals } = useProfessionals();
  const { patients } = usePatients();
  const { procedures } = useTreatmentPlans();

  const activeProfessionals = professionals.filter((p) => p.active);

  // Map professionalId → color
  const profColorMap = Object.fromEntries(
    activeProfessionals.map((p, i) => [p.id, PROFESSIONAL_COLORS[i % PROFESSIONAL_COLORS.length]])
  );

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["clinic-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patient:patients(full_name, phone),
          professional:professionals(
            id,
            profile:profiles(full_name, avatar_url)
          ),
          procedure:procedures(name, category)
        `)
        .not("patient_id", "is", null)
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const filtered = (appointments ?? []).filter((apt) => {
    if (filterProfessionalId === "all") return true;
    return apt.professional_id === filterProfessionalId;
  });

  const dayAppointments = filtered.filter((apt) =>
    isSameDay(new Date(apt.scheduled_for), selectedDate)
  );

  const calendarEvents = filtered.map((apt) => ({
    id: apt.id,
    title: `${apt.patient?.full_name ?? apt.client_name ?? "Paciente"} — ${
      apt.procedure?.name ?? "Consulta"
    }`,
    start: new Date(apt.scheduled_for),
    end: addMinutes(new Date(apt.scheduled_for), apt.duration_minutes || 60),
    resource: apt,
    color: apt.professional_id ? profColorMap[apt.professional_id] : undefined,
  }));

  const openCreate = () => {
    setSelectedAppointment(null);
    setShowForm(true);
  };

  const openEdit = (apt: any) => {
    setSelectedAppointment(apt);
    setShowForm(true);
  };

  const getInitials = (name?: string | null) =>
    (name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View toggle */}
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setView("calendar")}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  view === "calendar"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarIcon className="h-4 w-4" />
                Calendário
              </button>
              <button
                onClick={() => setView("list")}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  view === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-4 w-4" />
                Lista
              </button>
            </div>

            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Agendamento
            </Button>
          </div>
        </div>

        {/* Filtro por profissional */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterProfessionalId("all")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition ${
              filterProfessionalId === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Todos
          </button>
          {activeProfessionals.map((prof, i) => {
            const color = PROFESSIONAL_COLORS[i % PROFESSIONAL_COLORS.length];
            const isActive = filterProfessionalId === prof.id;
            return (
              <button
                key={prof.id}
                onClick={() => setFilterProfessionalId(prof.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition ${
                  isActive ? "border-transparent text-white" : "border-border hover:bg-muted"
                }`}
                style={isActive ? { backgroundColor: color } : {}}
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={prof.profile?.avatar_url ?? undefined} />
                  <AvatarFallback
                    className="text-[10px]"
                    style={{ backgroundColor: color, color: "#fff" }}
                  >
                    {getInitials(prof.profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span>{prof.profile?.full_name ?? "Profissional"}</span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1 py-0 h-4 ml-1"
                  style={isActive ? { borderColor: "rgba(255,255,255,0.4)", color: "white" } : {}}
                >
                  {
                    (appointments ?? []).filter((a) => a.professional_id === prof.id).length
                  }
                </Badge>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <Skeleton className="h-[600px] w-full rounded-xl" />
        ) : view === "calendar" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-4">
              <CalendarView
                events={calendarEvents}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onSelectEvent={(event) => openEdit(event.resource)}
              />
            </Card>
            <Card className="p-4">
              <DayView
                date={selectedDate}
                appointments={dayAppointments}
                onSelectAppointment={openEdit}
              />
            </Card>
          </div>
        ) : (
          <Card className="p-4">
            <h3 className="font-semibold mb-4">
              Todos os Agendamentos
              <span className="text-muted-foreground font-normal text-sm ml-2">
                ({filtered.length})
              </span>
            </h3>
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum agendamento encontrado.
                </p>
              ) : (
                filtered.map((apt) => {
                  const color = apt.professional_id
                    ? profColorMap[apt.professional_id]
                    : "#e5e7eb";
                  return (
                    <button
                      key={apt.id}
                      onClick={() => openEdit(apt)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition text-left"
                    >
                      <div
                        className="w-1 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {apt.patient?.full_name ?? apt.client_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(apt.scheduled_for), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {apt.procedure?.name && ` · ${apt.procedure.name}`}
                          {apt.room && ` · ${apt.room}`}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {apt.professional?.profile?.full_name && (
                          <span className="text-xs text-muted-foreground">
                            {apt.professional.profile.full_name}
                          </span>
                        )}
                        <Badge
                          variant={apt.status === "completed" ? "default" : apt.status === "cancelled" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {apt.status === "scheduled" ? "Agendado"
                            : apt.status === "confirmed" ? "Confirmado"
                            : apt.status === "completed" ? "Concluído"
                            : apt.status === "cancelled" ? "Cancelado"
                            : apt.status === "no_show" ? "Não compareceu"
                            : apt.status}
                        </Badge>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        )}
      </div>

      {showForm && (
        <ClinicAgendamentoForm
          appointment={selectedAppointment}
          defaultProfessionalId={filterProfessionalId !== "all" ? filterProfessionalId : undefined}
          defaultDate={selectedDate}
          professionals={activeProfessionals}
          patients={patients}
          procedures={procedures}
          onClose={() => {
            setShowForm(false);
            setSelectedAppointment(null);
          }}
        />
      )}
    </AppLayout>
  );
}
