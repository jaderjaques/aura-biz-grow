import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, differenceInDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Phone,
  Mail,
  Video,
  ArrowRight,
  CheckSquare,
  Building,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { TaskWithDetails, TASK_TYPE_LABELS } from "@/types/tasks";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: TaskWithDetails;
  onClick: () => void;
  isDragging?: boolean;
}

const getTaskTypeIcon = (type: string) => {
  switch (type) {
    case "call":
      return <Phone className="h-3 w-3" />;
    case "email":
      return <Mail className="h-3 w-3" />;
    case "meeting":
      return <Video className="h-3 w-3" />;
    case "follow_up":
      return <ArrowRight className="h-3 w-3" />;
    default:
      return <CheckSquare className="h-3 w-3" />;
  }
};

export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue =
    task.due_date &&
    task.status !== "done" &&
    new Date(task.due_date) < new Date();

  const daysOverdue = task.due_date
    ? differenceInDays(new Date(), new Date(task.due_date))
    : 0;

  const checklistProgress = task.checklist
    ? {
        completed: task.checklist.filter((i) => i.completed).length,
        total: task.checklist.length,
      }
    : null;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab hover:shadow-md transition-shadow",
        (isDragging || isSortableDragging) && "opacity-50 rotate-3 shadow-xl",
        task.status === "done" && "opacity-60"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Priority badges */}
        <div className="flex gap-1 flex-wrap">
          {task.priority === "urgent" && (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 text-xs">
              Urgente
            </Badge>
          )}
          {task.priority === "high" && (
            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 text-xs">
              Alta
            </Badge>
          )}
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              {daysOverdue === 0 ? "Vence hoje" : `Atrasado ${daysOverdue}d`}
            </Badge>
          )}
        </div>

        {/* Title */}
        <p
          className={cn(
            "font-medium text-sm line-clamp-2",
            task.status === "done" && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>

        {/* Task type */}
        {task.task_type && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {getTaskTypeIcon(task.task_type)}
            <span>{TASK_TYPE_LABELS[task.task_type as keyof typeof TASK_TYPE_LABELS]}</span>
          </div>
        )}

        {/* Related entity */}
        {(task.lead || task.customer) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building className="h-3 w-3" />
            <span className="truncate">
              {task.lead?.company_name || task.customer?.company_name}
            </span>
          </div>
        )}

        {/* Checklist progress */}
        {checklistProgress && checklistProgress.total > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3" />
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${(checklistProgress.completed / checklistProgress.total) * 100}%`,
                }}
              />
            </div>
            <span>
              {checklistProgress.completed}/{checklistProgress.total}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          {task.assigned_user ? (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary/10">
                {task.assigned_user.full_name[0]}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-6 w-6" />
          )}

          {task.due_date && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs",
                isOverdue ? "text-destructive" : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {format(new Date(task.due_date), "dd/MM")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
