import { useDroppable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  children: React.ReactNode;
}

export function KanbanColumn({ id, title, color, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex-shrink-0 w-80">
      <Card
        ref={setNodeRef}
        className={cn(
          "h-full min-h-[500px] transition-colors",
          isOver && "ring-2 ring-primary bg-muted/50"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium">{title}</span>
            </div>
            <Badge variant="secondary">{count}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">{children}</CardContent>
      </Card>
    </div>
  );
}
