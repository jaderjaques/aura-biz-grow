import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AgendamentoCard } from "./AgendamentoCard";
import { CalendarDays } from "lucide-react";

interface DayViewProps {
  date: Date;
  appointments: any[];
  onSelectAppointment: (apt: any) => void;
}

export function DayView({ date, appointments, onSelectAppointment }: DayViewProps) {
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b">
        <div className="h-14 w-14 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground text-xl font-bold">
          {format(date, "d")}
        </div>
        <div>
          <p className="font-semibold text-foreground capitalize">
            {format(date, "EEEE", { locale: ptBR })}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <CalendarDays className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Nenhum agendamento para este dia</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {sorted.length} {sorted.length === 1 ? "agendamento" : "agendamentos"}
          </p>
          {sorted.map((apt) => (
            <AgendamentoCard
              key={apt.id}
              appointment={apt}
              onClick={() => onSelectAppointment(apt)}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
