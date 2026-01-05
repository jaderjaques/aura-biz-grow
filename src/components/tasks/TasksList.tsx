import { format, differenceInDays } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Eye,
  CheckCircle,
  Trash2,
  Phone,
  Mail,
  Video,
  ArrowRight,
  CheckSquare,
} from "lucide-react";
import { TaskWithDetails, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_TYPE_LABELS } from "@/types/tasks";
import { useTasks } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

interface TasksListProps {
  tasks: TaskWithDetails[];
  onOpenTask: (taskId: string) => void;
}

const getTaskTypeIcon = (type: string) => {
  switch (type) {
    case "call":
      return <Phone className="h-4 w-4" />;
    case "email":
      return <Mail className="h-4 w-4" />;
    case "meeting":
      return <Video className="h-4 w-4" />;
    case "follow_up":
      return <ArrowRight className="h-4 w-4" />;
    default:
      return <CheckSquare className="h-4 w-4" />;
  }
};

const getPriorityBadge = (priority: string) => {
  const styles: Record<string, string> = {
    urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
    medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
  };
  return (
    <Badge className={styles[priority] || styles.medium}>
      {TASK_PRIORITY_LABELS[priority as keyof typeof TASK_PRIORITY_LABELS] || priority}
    </Badge>
  );
};

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    todo: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    waiting: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  };
  return (
    <Badge className={styles[status] || styles.todo}>
      {TASK_STATUS_LABELS[status as keyof typeof TASK_STATUS_LABELS] || status}
    </Badge>
  );
};

export function TasksList({ tasks, onOpenTask }: TasksListProps) {
  const { updateTaskStatus, deleteTask } = useTasks();

  const handleComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTaskStatus.mutate({ id: taskId, status: "done" });
  };

  const handleDelete = async (taskId: string) => {
    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
      await deleteTask.mutateAsync(taskId);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12"></TableHead>
          <TableHead>Tarefa</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Prioridade</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Relacionado</TableHead>
          <TableHead>Responsável</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-12">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <p className="text-muted-foreground">Nenhuma tarefa encontrada</p>
            </TableCell>
          </TableRow>
        ) : (
          tasks.map((task) => {
            const isOverdue =
              task.due_date &&
              task.status !== "done" &&
              new Date(task.due_date) < new Date();
            const daysOverdue = task.due_date
              ? differenceInDays(new Date(), new Date(task.due_date))
              : 0;

            return (
              <TableRow
                key={task.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onOpenTask(task.id)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={task.status === "done"}
                    onCheckedChange={() =>
                      updateTaskStatus.mutate({
                        id: task.id,
                        status: task.status === "done" ? "todo" : "done",
                      })
                    }
                  />
                </TableCell>

                <TableCell>
                  <p
                    className={cn(
                      "font-medium",
                      task.status === "done" && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {task.description}
                    </p>
                  )}
                </TableCell>

                <TableCell>
                  {task.task_type && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      {getTaskTypeIcon(task.task_type)}
                      <span className="text-sm">
                        {TASK_TYPE_LABELS[task.task_type as keyof typeof TASK_TYPE_LABELS]}
                      </span>
                    </div>
                  )}
                </TableCell>

                <TableCell>{getPriorityBadge(task.priority)}</TableCell>

                <TableCell>{getStatusBadge(task.status)}</TableCell>

                <TableCell>
                  {(task.lead || task.customer || task.deal) && (
                    <span className="text-sm text-muted-foreground">
                      {task.lead?.company_name ||
                        task.customer?.company_name ||
                        task.deal?.title}
                    </span>
                  )}
                </TableCell>

                <TableCell>
                  {task.assigned_user && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {task.assigned_user.full_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task.assigned_user.full_name}</span>
                    </div>
                  )}
                </TableCell>

                <TableCell>
                  {task.due_date && (
                    <div>
                      <span
                        className={cn(
                          "text-sm",
                          isOverdue && "text-destructive font-medium"
                        )}
                      >
                        {format(new Date(task.due_date), "dd/MM/yyyy")}
                      </span>
                      {isOverdue && daysOverdue > 0 && (
                        <p className="text-xs text-destructive">
                          Atrasado há {daysOverdue} dias
                        </p>
                      )}
                    </div>
                  )}
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onOpenTask(task.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      {task.status !== "done" && (
                        <DropdownMenuItem onClick={(e) => handleComplete(task.id, e as unknown as React.MouseEvent)}>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                          Marcar como Concluída
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(task.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
