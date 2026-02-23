import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "pt-BR": ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales,
});

interface CalendarViewProps {
  events: any[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: any) => void;
}

export function CalendarView({
  events,
  selectedDate,
  onSelectDate,
  onSelectEvent,
}: CalendarViewProps) {
  const eventStyleGetter = (event: any) => {
    const status = event.resource?.status;
    let backgroundColor = "hsl(38 92% 50%)"; // warning - scheduled

    if (status === "confirmed") backgroundColor = "hsl(142 71% 45%)";
    else if (status === "completed") backgroundColor = "hsl(300 41% 39%)";
    else if (status === "cancelled") backgroundColor = "hsl(0 0% 45%)";

    return {
      style: {
        backgroundColor,
        borderRadius: "6px",
        opacity: 0.9,
        color: "white",
        border: "none",
        fontSize: "13px",
        padding: "2px 6px",
      },
    };
  };

  return (
    <div className="space-y-3">
      <div className="h-[600px]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          date={selectedDate}
          onNavigate={onSelectDate}
          onSelectSlot={(slotInfo) => onSelectDate(slotInfo.start)}
          onSelectEvent={onSelectEvent}
          selectable
          eventPropGetter={eventStyleGetter}
          views={[Views.MONTH, Views.WEEK]}
          defaultView={Views.MONTH}
          messages={{
            today: "Hoje",
            previous: "Anterior",
            next: "Próximo",
            month: "Mês",
            week: "Semana",
            day: "Dia",
            agenda: "Agenda",
            noEventsInRange: "Sem agendamentos neste período",
            showMore: (total: number) => `+ ${total} mais`,
          }}
          culture="pt-BR"
        />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-warning" />
          <span>Agendado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-success" />
          <span>Confirmado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>Concluído</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted-foreground" />
          <span>Cancelado</span>
        </div>
      </div>
    </div>
  );
}
