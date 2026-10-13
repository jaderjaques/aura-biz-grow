import { addDays, addMonths, addWeeks, differenceInCalendarDays, differenceInCalendarMonths, startOfDay } from "date-fns";
import { parseDateOnly } from "@/lib/date-utils";
import { TaskWithDetails } from "@/types/tasks";

export interface TaskOccurrence {
  key: string;
  task: TaskWithDetails;
  date: Date;
  hasTime: boolean;
  recurring: boolean;
}

const MAX_OCCURRENCES = 400;

// Tarefas com data aparecem na data; tarefas recorrentes abertas se repetem (diária, semanal, mensal)
// dentro da janela pedida. As repetições são calculadas na hora, não existem no banco.
// Tarefa recorrente sem data usa o dia em que foi criada como início.
export function taskOccurrences(task: TaskWithDetails, from: Date, to: Date): TaskOccurrence[] {
  if (task.status === "cancelled") return [];
  const open = task.status !== "done";
  const recurring = !!task.is_recurring && open && ["daily", "weekly", "monthly"].includes(task.recurrence_pattern ?? "");
  const anchor = task.due_date
    ? parseDateOnly(task.due_date)
    : recurring && task.created_at ? startOfDay(new Date(task.created_at)) : null;
  if (!anchor) return [];

  const [h, m] = (task.due_time ?? "").split(":").map(Number);
  const hasTime = !!task.due_time && Number.isFinite(h);
  const at = (d: Date) => {
    const out = new Date(d);
    if (hasTime) out.setHours(h, Number.isFinite(m) ? m : 0, 0, 0);
    return out;
  };
  const make = (d: Date): TaskOccurrence => ({ key: `${task.id}:${d.toISOString().slice(0, 10)}`, task, date: at(d), hasTime, recurring });

  if (!recurring) return anchor >= startOfDay(from) && anchor <= to ? [make(anchor)] : [];

  const pattern = task.recurrence_pattern;
  const start = Math.max(
    0,
    pattern === "daily" ? differenceInCalendarDays(from, anchor)
      : pattern === "weekly" ? Math.floor(differenceInCalendarDays(from, anchor) / 7)
      : differenceInCalendarMonths(from, anchor) - 1,
  );
  const out: TaskOccurrence[] = [];
  for (let i = start; out.length < MAX_OCCURRENCES; i++) {
    const d = pattern === "daily" ? addDays(anchor, i) : pattern === "weekly" ? addWeeks(anchor, i) : addMonths(anchor, i);
    if (d > to) break;
    if (d >= startOfDay(from)) out.push(make(d));
  }
  return out;
}
