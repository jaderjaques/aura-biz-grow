import { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import { TaskWithDetails, TaskStatus } from "@/types/tasks";
import { useTasks } from "@/hooks/useTasks";
import { TaskCard } from "./TaskCard";
import { KanbanColumn } from "./KanbanColumn";

interface TasksKanbanProps {
  tasks: TaskWithDetails[];
  onOpenTask: (taskId: string) => void;
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: "todo", title: "A Fazer", color: "#6B7280" },
  { id: "in_progress", title: "Em Progresso", color: "#3B82F6" },
  { id: "waiting", title: "Aguardando", color: "#F59E0B" },
  { id: "done", title: "Concluído", color: "#10B981" },
];

export function TasksKanban({ tasks, onOpenTask }: TasksKanbanProps) {
  const { updateTaskStatus } = useTasks();
  const [activeTask, setActiveTask] = useState<TaskWithDetails | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const tasksByColumn = useMemo(() => {
    const grouped: Record<TaskStatus, TaskWithDetails[]> = {
      todo: [],
      in_progress: [],
      waiting: [],
      done: [],
      cancelled: [],
    };

    tasks.forEach((task) => {
      const status = task.status as TaskStatus;
      if (grouped[status]) {
        grouped[status].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const column = COLUMNS.find((c) => c.id === overId);
    if (column) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== column.id) {
        updateTaskStatus.mutate({ id: taskId, status: column.id });
      }
      return;
    }

    // Check if dropped on another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== overTask.status) {
        updateTaskStatus.mutate({ id: taskId, status: overTask.status as TaskStatus });
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.filter((c) => c.id !== "cancelled").map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            count={tasksByColumn[column.id].length}
          >
            <SortableContext
              items={tasksByColumn[column.id].map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {tasksByColumn[column.id].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onOpenTask(task.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </KanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} onClick={() => {}} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
