import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  Circle,
  Trash2,
  Calendar,
  Clock,
  User,
  Briefcase,
  Tag,
} from "lucide-react";
import {
  TaskWithDetails,
  TaskStatus,
  ChecklistItem,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_TYPE_LABELS,
} from "@/types/tasks";

const priorityColor: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-slate-400",
};

interface TaskDetailsSheetProps {
  task: TaskWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onUpdate: (id: string, updates: { checklist?: ChecklistItem[] }) => void;
  onDelete: (id: string) => void;
}

export function TaskDetailsSheet({
  task,
  open,
  onOpenChange,
  onStatusChange,
  onUpdate,
  onDelete,
}: TaskDetailsSheetProps) {
  if (!task) return null;

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  const toggleChecklistItem = (idx: number) => {
    if (!task.checklist) return;
    const updated = task.checklist.map((it, i) =>
      i === idx ? { ...it, completed: !it.completed } : it
    );
    onUpdate(task.id, { checklist: updated });
  };

  const linked =
    task.lead?.company_name ||
    task.customer?.company_name ||
    task.deal?.title;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                priorityColor[task.priority] || "bg-slate-400"
              }`}
            />
            <Badge variant="secondary" className="text-xs">
              {TASK_PRIORITY_LABELS[task.priority]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {TASK_STATUS_LABELS[task.status]}
            </Badge>
          </div>
          <SheetTitle className="text-left">{task.title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 py-4">
          {task.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Descrição
              </p>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Vencimento</p>
                <p>
                  {fmtDate(task.due_date)}
                  {task.due_time ? ` ${task.due_time}` : ""}
                </p>
              </div>
            </div>
            {task.task_type && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p>{TASK_TYPE_LABELS[task.task_type]}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Responsável</p>
                <p>{task.assigned_user?.full_name || "Não atribuído"}</p>
              </div>
            </div>
            {linked && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Vinculado a</p>
                  <p className="truncate">{linked}</p>
                </div>
              </div>
            )}
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {t}
                </Badge>
              ))}
            </div>
          )}

          {task.checklist && task.checklist.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Checklist (
                {task.checklist.filter((i) => i.completed).length}/
                {task.checklist.length})
              </p>
              <div className="space-y-1.5">
                {task.checklist.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleChecklistItem(idx)}
                    className="flex items-center gap-2 text-sm w-full text-left hover:bg-muted/50 rounded px-1 py-0.5"
                  >
                    {item.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span
                      className={
                        item.completed
                          ? "line-through text-muted-foreground"
                          : ""
                      }
                    >
                      {item.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Status</p>
            <Select
              value={task.status}
              onValueChange={(v) => onStatusChange(task.id, v as TaskStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {TASK_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
                <AlertDialogDescription>
                  A tarefa <strong>{task.title}</strong> será removida
                  permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={() => {
                    onDelete(task.id);
                    onOpenChange(false);
                  }}
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
