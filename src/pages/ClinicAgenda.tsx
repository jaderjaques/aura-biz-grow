import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { isSameDay, addMinutes, format, subMonths, addMonths } from "date-fns";
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
import { Plus, Calendar as CalendarIcon, List, Users, Stethoscope } from "lucide-react";
import { useProfessionals } from "@/hooks/useProfessionals";
import { PROFESSIONAL_COLORS } from "@/types/professionals";

interface Consultorio {
  id: string;
  name: string;
  active: boolean;
}

export default function ClinicAgenda() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [filterProfessionalId, setFilterProfessionalId] = useState<string>("all");
  const [filterConsultorioId, setFilterConsultorioId] = useState<string>("all");

  const { professionals } = useProfessionals();

  const activeProfessionals = professionals.filter((p) => p.active);

  // Intervalo fixo: 3 meses atrás até 6 meses à frente
  const rangeStart = useMemo(() => subMonths(new Date(), 3).toISOString(), []);
  const rangeEnd   = useMemo(() => addMonths(new Date(), 6).toISOString(), []);

  // Pacientes — query leve (só id, nome, telefone)
  const { data: patients = [] } = useQuery({
    queryKey: ["patients-agenda"],
    queryFn: async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, full_name, phone")
        .is("deleted_at", null)
        .order("full_name");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Procedimentos — query leve (sem planos de tratamento)
  const { data: procedures = [] } = useQuery({
    queryKey: ["procedures-agenda"],
    queryFn: async () => {
      const { data } = await supabase
        .from("procedures")
        .select("id, name, category, duration_minutes")
        .eq("active", true)
        .order("name");
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  // Map professionalId → color
  const profColorMap = Object.fromEntries(
    activeProfessionals.map((p, i) => [p.id, PROFESSIONAL_COLORS[i % PROFESSIONAL_COLORS.length]])
  );

  // Fetch consultorios
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

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["clinic-appointments", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id, patient_id, professional_id, procedure_id, consultorio_id,
          scheduled_for, duration_minutes, status, internal_notes,
          client_name, client_phone, title,
          patient:patients(full_name, phone),
          professional:professionals(
            id,
            profile:profiles(full_name, avatar_url)
          ),
          procedure:procedures(name, category),
          consultorio:consultorios(id, name)
        `)
        .gte("scheduled_for", rangeStart)
        .lte("scheduled_for", rangeEnd)
        .not("patient_id", "is", null)
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000, // 1 minuto
  });

  const filtered = (appointments ?? []).filter((apt) => {
    const matchProf = filterProfessionalId === "all" || apt.professional_id === filterProfessionalId;
    const matchConsult = filterConsultorioId === "all" || apt.consultorio_id === filterConsultorioId;
    return matchProf && matchConsult;
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

  const STATUS_LABEL: Record<string, string> = {
    scheduled: "Agendado",
    confirmed: "Confirmado",
    in_progress: "Em atendimento",
    completed: "Concluído",
    cancelled: "Cancelado",
    no_show: "Não compareceu",
  };

  return (
    <AppLayout>
      <div className="space-y-4 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
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
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 font-medium flex items-center gap-1">
            <Users className="h-3 w-3" /> Profissional
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterProfessionalId("all")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition ${
                filterProfessionalId === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
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
                    {(appointments ?? []).filter((a) => a.professional_id === prof.id).length}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtro por consultório */}
        {consultorios.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-medium flex items-center gap-1">
              <Stethoscope className="h-3 w-3" /> Consultório
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterConsultorioId("all")}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  filterConsultorioId === "all"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                Todos
              </button>
              {consultorios.map((c) => {
                const isActive = filterConsultorioId === c.id;
                const count = (appointments ?? []).filter((a) => a.consultorio_id === c.id).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => setFilterConsultorioId(c.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition ${
                      isActive
                        ? "bg-secondary text-secondary-foreground border-secondary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Stethoscope className="h-3.5 w-3.5" />
                    {c.name}
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 ml-1">
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
                          {apt.consultorio?.name && (
                            <span className="ml-1 inline-flex items-center gap-0.5">
                              · <Stethoscope className="h-3 w-3 inline" /> {apt.consultorio.name}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {apt.professional?.profile?.full_name && (
                          <span className="text-xs text-muted-foreground hidden sm:block">
                            {apt.professional.profile.full_name}
                          </span>
                        )}
                        <Badge
                          variant={
                            apt.status === "completed" ? "default"
                            : apt.status === "cancelled" ? "destructive"
                            : "secondary"
                          }
                          className="text-xs"
                        >
                          {STATUS_LABEL[apt.status] ?? apt.status}
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
          defaultConsultorioId={filterConsultorioId !== "all" ? filterConsultorioId : undefined}
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
