import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lead, PipelineStage } from "@/types/leads";
import { LeadScoreBadge } from "./LeadScoreBadge";
import { GripVertical, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadsKanbanProps {
  leads: Lead[];
  stages: PipelineStage[];
  onOpenLead: (id: string) => void;
  onMoveStage: (leadId: string, fromStage: string, toStage: string) => void;
}

interface KanbanCardProps {
  lead: Lead;
  onClick: () => void;
}

function KanbanCard({ lead, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { lead, stage: lead.stage } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow",
        isDragging && "opacity-50 shadow-lg"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header with new badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {!lead.viewed_at && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0 mb-1">
                  Novo
                </Badge>
              )}
              <p className="font-medium text-sm truncate">{lead.company_name}</p>
            </div>
          </div>

          {/* Contact name */}
          {lead.contact_name && (
            <p className="text-xs text-muted-foreground truncate">
              {lead.contact_name}
            </p>
          )}

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {lead.tags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  {tag.name}
                </Badge>
              ))}
              {lead.tags.length > 2 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{lead.tags.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            {lead.assigned_user ? (
              <Avatar className="h-5 w-5">
                <AvatarImage src={lead.assigned_user.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {lead.assigned_user.full_name[0]}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                <User className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <LeadScoreBadge score={lead.lead_score} />
          </div>

          {/* Estimated value */}
          {lead.estimated_value && (
            <p className="text-xs font-medium text-green-600 dark:text-green-400">
              Est: {formatCurrency(lead.estimated_value)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  onOpenLead: (id: string) => void;
}

function KanbanColumn({ stage, leads, onOpenLead }: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[280px] h-full">
      <Card className="flex flex-col h-full">
        <CardHeader className="py-3 px-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              {leads.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-2 overflow-hidden">
          <ScrollArea className="h-full">
            <SortableContext
              items={leads.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 pb-4">
                {leads.map((lead) => (
                  <KanbanCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => onOpenLead(lead.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export function LeadsKanban({ leads, stages, onOpenLead, onMoveStage }: LeadsKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getLeadsByStage = (stageName: string) => {
    return leads.filter((lead) => lead.stage === stageName);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeData = active.data.current as { lead: Lead; stage: string };
    const overId = over.id as string;

    // Find target stage
    const targetStage = stages.find((s) => s.name === overId);
    const targetLead = leads.find((l) => l.id === overId);

    let newStage: string | null = null;

    if (targetStage) {
      newStage = targetStage.name;
    } else if (targetLead) {
      newStage = targetLead.stage;
    }

    if (newStage && newStage !== activeData.stage) {
      onMoveStage(active.id as string, activeData.stage, newStage);
    }
  };

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-320px)]">
        {stages.map((stage) => (
          <div key={stage.id} id={stage.name}>
            <SortableContext items={[stage.name]}>
              <KanbanColumn
                stage={stage}
                leads={getLeadsByStage(stage.name)}
                onOpenLead={onOpenLead}
              />
            </SortableContext>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeLead && (
          <div className="bg-card border rounded-lg p-3 shadow-lg w-[260px] opacity-90">
            <p className="font-medium text-sm">{activeLead.company_name}</p>
            {activeLead.contact_name && (
              <p className="text-xs text-muted-foreground">{activeLead.contact_name}</p>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
