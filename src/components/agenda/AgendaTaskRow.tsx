import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckSquare, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskOccurrence } from "@/lib/task-occurrences";
import { TASK_PRIORITY_LABELS } from "@/types/tasks";

// Uma tarefa dentro da Agenda; clicar abre os detalhes da tarefa.
export function AgendaTaskRow({ occ, onClick, showDate }: { occ: TaskOccurrence; onClick: () => void; showDate?: boolean }) {
  const { task } = occ;
  const done = task.status === "done";
  const who = task.customer?.company_name ?? task.lead?.company_name;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors flex items-start gap-3"
    >
      <CheckSquare className={`h-4 w-4 mt-0.5 shrink-0 ${done ? "text-muted-foreground" : "text-blue-500"}`} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className={`text-sm font-medium break-words ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {showDate && <span className="capitalize">{format(occ.date, "EEE, d 'de' MMM", { locale: ptBR })}</span>}
          {occ.hasTime && <span>{format(occ.date, "HH:mm")}</span>}
          {who && <span className="truncate">{who}</span>}
          {occ.recurring && (
            <Badge variant="outline" className="gap-1 h-5 px-1.5">
              <Repeat className="h-3 w-3" />
              {task.recurrence_pattern === "daily" ? "Diária" : task.recurrence_pattern === "weekly" ? "Semanal" : "Mensal"}
            </Badge>
          )}
          {task.priority && task.priority !== "medium" && <Badge variant="secondary" className="h-5 px-1.5">{TASK_PRIORITY_LABELS[task.priority]}</Badge>}
        </div>
      </div>
    </button>
  );
}
