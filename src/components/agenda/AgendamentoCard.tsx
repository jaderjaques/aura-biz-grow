import { format } from "date-fns";
import { Clock, MapPin, User, Video } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { Card } from "@/components/ui/card";

interface AgendamentoCardProps {
  appointment: any;
  onClick: () => void;
  compact?: boolean;
}

export function AgendamentoCard({ appointment, onClick, compact = false }: AgendamentoCardProps) {
  const clientName =
    appointment.customer?.company_name ||
    appointment.lead?.company_name ||
    appointment.client_name;

  const contactName =
    appointment.customer?.contact_name ||
    appointment.lead?.contact_name ||
    appointment.client_name;

  const typeLabels: Record<string, string> = {
    demo: "Demo",
    meeting: "Reunião",
    consultation: "Consultoria",
    presentation: "Apresentação",
    follow_up: "Follow-up",
  };

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{
        borderLeftColor:
          appointment.status === "confirmed"
            ? "hsl(var(--success))"
            : appointment.status === "completed"
            ? "hsl(var(--primary))"
            : appointment.status === "cancelled"
            ? "hsl(var(--muted-foreground))"
            : "hsl(var(--warning))",
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-foreground truncate">{clientName}</h4>
          <p className="text-sm text-muted-foreground truncate">{contactName}</p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <div className="space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {format(new Date(appointment.scheduled_for), "HH:mm")} -{" "}
            {appointment.duration_minutes} min
          </span>
        </div>

        <div className="flex items-center gap-2">
          {appointment.location_type === "online" ? (
            <>
              <Video className="h-3.5 w-3.5 shrink-0" />
              <span>Online</span>
            </>
          ) : (
            <>
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {appointment.physical_address || "Presencial"}
              </span>
            </>
          )}
        </div>

        {appointment.assigned_user && (
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span>{appointment.assigned_user.full_name}</span>
          </div>
        )}
      </div>

      {!compact && appointment.description && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
          {appointment.description}
        </p>
      )}
    </Card>
  );
}
