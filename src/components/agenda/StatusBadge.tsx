import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  scheduled: {
    label: "Agendado",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  confirmed: {
    label: "Confirmado",
    className: "bg-success/10 text-success border-success/20",
  },
  completed: {
    label: "Concluído",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-muted text-muted-foreground border-border",
  },
  no_show: {
    label: "Não Compareceu",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.scheduled;

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
