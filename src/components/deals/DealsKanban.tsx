import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DealWithDetails, getDealTotal, getDealClientName } from "@/types/products";
import { DollarSign } from "lucide-react";

const STAGES = [
  { id: "proposta", title: "Proposta", color: "hsl(var(--primary))" },
  { id: "negociacao", title: "Negociação", color: "hsl(45, 93%, 47%)" },
  { id: "ganho", title: "Ganho", color: "hsl(142, 71%, 45%)" },
  { id: "perdido", title: "Perdido", color: "hsl(0, 84%, 60%)" },
];

interface DealsKanbanProps {
  deals: DealWithDetails[];
  onRefresh: () => void;
  onDealClick: (deal: DealWithDetails) => void;
  onDealWon: (deal: DealWithDetails) => void;
}

export function DealsKanban({ deals, onRefresh, onDealClick, onDealWon }: DealsKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = deals.filter((d) => {
      const dealStage = d.stage || 'proposta';
      return dealStage === stage.id;
    });
    return acc;
  }, {} as Record<string, DealWithDetails[]>);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const dealId = active.id as string;
    const newStage = over.id as string;
    const deal = deals.find((d) => d.id === dealId);

    if (!deal || deal.stage === newStage) return;

    try {
      const { error } = await supabase
        .from("deals")
        .update({
          stage: newStage,
          updated_at: new Date().toISOString(),
          ...(newStage === "ganho" ? { status: "won", probability: 100, closed_at: new Date().toISOString(), actual_close_date: new Date().toISOString().split("T")[0] } : {}),
          ...(newStage === "perdido" ? { status: "lost", probability: 0, closed_at: new Date().toISOString(), actual_close_date: new Date().toISOString().split("T")[0] } : {}),
        })
        .eq("id", dealId);

      if (error) throw error;

      if (newStage === "ganho") {
        // Fetch full deal with relationships for the won modal
        const { data: fullDeal } = await supabase
          .from("deals")
          .select(`
            *,
            lead:leads(id, company_name, trading_name, cnpj, segment, contact_name, position, phone, email),
            assigned_user:profiles!deals_assigned_to_fkey(id, full_name, avatar_url),
            deal_products(*, product:products(*))
          `)
          .eq("id", dealId)
          .single();

        if (fullDeal) {
          onDealWon(fullDeal as DealWithDetails);
        }
      } else {
        toast({ title: "Proposta movida com sucesso!" });
      }

      onRefresh();
    } catch (error: any) {
      console.error("Erro ao mover deal:", error);
      toast({ title: "Erro ao mover proposta", description: error.message, variant: "destructive" });
    }
  }

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4 min-h-[500px]">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={dealsByStage[stage.id] || []}
            onDealClick={onDealClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <div className="opacity-80 rotate-2">
            <DealCard deal={activeDeal} onClick={() => {}} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  stage,
  deals,
  onDealClick,
}: {
  stage: { id: string; title: string; color: string };
  deals: DealWithDetails[];
  onDealClick: (deal: DealWithDetails) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const totalValue = deals.reduce((sum, d) => sum + getDealTotal(d), 0);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border p-3 transition-colors ${
        isOver ? "bg-primary/5 border-primary/30" : "bg-muted/30"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="font-semibold text-sm">{stage.title}</span>
          <Badge variant="secondary" className="text-xs">
            {deals.length}
          </Badge>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {formatCurrency(totalValue)}
      </p>

      <div className="space-y-2 min-h-[100px]">
        {deals.map((deal) => (
          <DraggableDealCard
            key={deal.id}
            deal={deal}
            onClick={() => onDealClick(deal)}
          />
        ))}
        {deals.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            Nenhuma proposta
          </p>
        )}
      </div>
    </div>
  );
}

function DraggableDealCard({
  deal,
  onClick,
}: {
  deal: DealWithDetails;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard deal={deal} onClick={onClick} />
    </div>
  );
}

function DealCard({
  deal,
  onClick,
  isDragging,
}: {
  deal: DealWithDetails;
  onClick: () => void;
  isDragging?: boolean;
}) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${isDragging ? "shadow-lg" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <CardContent className="p-3 space-y-2">
        <p className="font-medium text-sm leading-tight">{deal.title}</p>

        {(deal.customer?.company_name || deal.lead?.company_name) && (
          <p className="text-xs text-muted-foreground">{getDealClientName(deal)}</p>
        )}

        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-semibold">{formatCurrency(getDealTotal(deal))}</span>
        </div>

        {deal.assigned_user && (
          <div className="flex justify-end">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">
                {deal.assigned_user.full_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}
