import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckSquare,
  Plus,
  Columns,
  List,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { TasksKanban } from "@/components/tasks/TasksKanban";
import { TasksList } from "@/components/tasks/TasksList";
import { NewTaskDialog } from "@/components/tasks/NewTaskDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function Tasks() {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filterAssigned, setFilterAssigned] = useState("me");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterDueDate, setFilterDueDate] = useState("all");
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { tasks, isLoading, metrics } = useTasks({
    assignedTo: filterAssigned,
    priority: filterPriority,
    dueDate: filterDueDate,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const handleOpenTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    // TODO: Open task details sidebar/modal
    console.log("Open task:", taskId);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tarefas</h1>
            <p className="text-muted-foreground">Gerencie suas atividades diárias</p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "kanban" | "list")}
            >
              <TabsList>
                <TabsTrigger value="kanban">
                  <Columns className="h-4 w-4 mr-2" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="h-4 w-4 mr-2" />
                  Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              onClick={() => setShowNewTask(true)}
              className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C42]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Minhas Tarefas</p>
                  <p className="text-2xl font-bold">{metrics?.myTasks || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">abertas</p>
                </div>
                <CheckSquare className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vence Hoje</p>
                  <p className="text-2xl font-bold">{metrics?.dueToday || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">tarefas</p>
                </div>
                <Clock className="h-8 w-8 text-[#F59E0B]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Atrasadas</p>
                  <p className="text-2xl font-bold text-destructive">
                    {metrics?.overdue || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">urgentes</p>
                </div>
                <AlertCircle className="h-8 w-8 text-[#EF4444]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Concluídas (hoje)</p>
                  <p className="text-2xl font-bold">{metrics?.completedToday || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">tarefas</p>
                </div>
                <CheckCircle className="h-8 w-8 text-[#10B981]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Select value={filterAssigned} onValueChange={setFilterAssigned}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="me">Minhas Tarefas</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unassigned">Não Atribuídas</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Prioridades</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDueDate} onValueChange={setFilterDueDate}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Vencimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="overdue">Atrasadas</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="tomorrow">Amanhã</SelectItem>
              <SelectItem value="this_week">Esta Semana</SelectItem>
              <SelectItem value="no_date">Sem Data</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : viewMode === "kanban" ? (
          <TasksKanban tasks={tasks} onOpenTask={handleOpenTask} />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <TasksList tasks={tasks} onOpenTask={handleOpenTask} />
            </CardContent>
          </Card>
        )}
      </div>

      <NewTaskDialog open={showNewTask} onOpenChange={setShowNewTask} />
    </AppLayout>
  );
}
