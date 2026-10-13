import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isSameDay, addMinutes, addDays, startOfMonth, endOfMonth } from "date-fns";
import { Plus, Calendar as CalendarIcon, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { CalendarView } from "@/components/agenda/CalendarView";
import { DayView } from "@/components/agenda/DayView";
import { AgendamentoForm } from "@/components/agenda/AgendamentoForm";
import { AgendamentoCard } from "@/components/agenda/AgendamentoCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { AgendaTaskRow } from "@/components/agenda/AgendaTaskRow";
import { TaskDetailsSheet } from "@/components/tasks/TaskDetailsSheet";
import { useTasks } from "@/hooks/useTasks";
import { taskOccurrences } from "@/lib/task-occurrences";

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [showTasks, setShowTasks] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // tarefas de todos; as com data e as recorrentes entram na agenda
  const { tasks, updateTask, updateTaskStatus, deleteTask } = useTasks({ assignedTo: "all" });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          customer:customers(company_name, contact_name),
          lead:leads(company_name, contact_name),
          assigned_user:profiles!appointments_assigned_to_fkey(full_name, email)
        `)
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const dayAppointments =
    appointments?.filter((apt) =>
      isSameDay(new Date(apt.scheduled_for), selectedDate)
    ) || [];

  // janela visível (mês + sobra das semanas vizinhas); as repetições são calculadas só nela
  const windowStart = addDays(startOfMonth(selectedDate), -7);
  const windowEnd = addDays(endOfMonth(selectedDate), 7);
  const occurrences = useMemo(
    () => (showTasks ? tasks.flatMap((t) => taskOccurrences(t, windowStart, windowEnd)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, showTasks, windowStart.getTime(), windowEnd.getTime()],
  );
  const dayTasks = occurrences
    .filter((o) => isSameDay(o.date, selectedDate))
    .sort((a, b) => Number(b.hasTime) - Number(a.hasTime) || a.date.getTime() - b.date.getTime());
  const upcomingTasks = useMemo(
    () => (showTasks ? tasks.flatMap((t) => taskOccurrences(t, new Date(), addDays(new Date(), 60))) : [])
      .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [tasks, showTasks],
  );
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const todayStart = new Date().setHours(0, 0, 0, 0);
  const calendarEvents = [
    ...(appointments?.map((apt) => ({
      id: apt.id,
      title: `${apt.client_name} - ${apt.appointment_type}`,
      start: new Date(apt.scheduled_for),
      end: addMinutes(new Date(apt.scheduled_for), apt.duration_minutes || 60),
      resource: apt,
    })) || []),
    ...occurrences.map((o) => ({
      id: o.key,
      kind: "task",
      title: `${o.recurring ? "↻ " : ""}${o.task.status === "done" ? "✓ " : ""}${o.task.title}`,
      start: o.date,
      end: o.hasTime ? addMinutes(o.date, 30) : o.date,
      allDay: !o.hasTime,
      done: o.task.status === "done",
      overdue: o.task.status !== "done" && !o.recurring && o.date.getTime() < todayStart,
      resource: o.task,
    })),
  ];

  function openCreate() {
    setSelectedAppointment(null);
    setShowForm(true);
  }

  function openEdit(apt: any) {
    setSelectedAppointment(apt);
    setShowForm(true);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seus agendamentos e reuniões
            </p>
          </div>

          <div className="flex items-center gap-3">
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

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Checkbox checked={showTasks} onCheckedChange={(v) => setShowTasks(v === true)} />
              Mostrar tarefas
            </label>

            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[600px] w-full rounded-xl" />
          </div>
        ) : view === "calendar" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-4">
              <CalendarView
                events={calendarEvents}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onSelectEvent={(event) => (event.kind === "task" ? setSelectedTaskId(event.resource.id) : openEdit(event.resource))}
              />
            </Card>
            <Card className="p-4">
              <DayView
                date={selectedDate}
                appointments={dayAppointments}
                onSelectAppointment={openEdit}
                tasks={dayTasks}
                onSelectTask={setSelectedTaskId}
              />
            </Card>
          </div>
        ) : (
          <Card className="p-4">
            <h3 className="font-semibold text-foreground mb-4">
              Todos os Agendamentos
            </h3>
            <div className="space-y-3">
              {appointments?.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum agendamento encontrado
                </p>
              ) : (
                appointments?.map((apt) => (
                  <AgendamentoCard
                    key={apt.id}
                    appointment={apt}
                    onClick={() => openEdit(apt)}
                  />
                ))
              )}
            </div>
          </Card>
        )}

        {view === "list" && upcomingTasks.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-foreground mb-4">Tarefas dos próximos 60 dias</h3>
            <div className="space-y-3">
              {upcomingTasks.map((occ) => (
                <AgendaTaskRow key={occ.key} occ={occ} showDate onClick={() => setSelectedTaskId(occ.task.id)} />
              ))}
            </div>
          </Card>
        )}
      </div>

      <TaskDetailsSheet
        task={selectedTask}
        open={!!selectedTaskId}
        onOpenChange={(o) => { if (!o) setSelectedTaskId(null); }}
        onStatusChange={(id, status) => updateTaskStatus.mutate({ id, status })}
        onUpdate={(id, updates) => updateTask.mutate({ id, ...updates })}
        onDelete={(id) => deleteTask.mutate(id)}
      />

      {showForm && (
        <AgendamentoForm
          appointment={selectedAppointment}
          onClose={() => {
            setShowForm(false);
            setSelectedAppointment(null);
          }}
        />
      )}
    </AppLayout>
  );
}
