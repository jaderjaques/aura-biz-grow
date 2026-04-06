import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User, FileText, DollarSign, ChevronDown,
  CheckCircle, Clock, XCircle, PlayCircle,
} from "lucide-react";
import {
  TreatmentPlanWithDetails,
  TreatmentPlanItem,
  TreatmentPlanStatus,
  TreatmentPlanItemStatus,
  PLAN_STATUS_LABELS,
  PLAN_STATUS_VARIANTS,
  ITEM_STATUS_LABELS,
} from "@/types/treatmentPlans";

interface Props {
  plan: TreatmentPlanWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeStatus: (id: string, status: TreatmentPlanStatus) => Promise<void>;
  onUpdateItemProgress: (itemId: string, sessionsCompleted: number, status: string) => Promise<void>;
  fetchItems: (planId: string) => Promise<TreatmentPlanItem[]>;
}

const STATUS_TRANSITIONS: Record<TreatmentPlanStatus, { label: string; next: TreatmentPlanStatus; icon: React.ElementType }[]> = {
  draft:            [{ label: "Enviar para Aprovação", next: "pending_approval", icon: Clock }],
  pending_approval: [{ label: "Aprovar", next: "approved", icon: CheckCircle }, { label: "Cancelar", next: "cancelled", icon: XCircle }],
  approved:         [{ label: "Iniciar Tratamento", next: "in_progress", icon: PlayCircle }, { label: "Cancelar", next: "cancelled", icon: XCircle }],
  in_progress:      [{ label: "Concluir", next: "completed", icon: CheckCircle }, { label: "Cancelar", next: "cancelled", icon: XCircle }],
  completed:        [],
  cancelled:        [{ label: "Reabrir como Rascunho", next: "draft", icon: FileText }],
};

const ITEM_STATUS_NEXT: Record<TreatmentPlanItemStatus, TreatmentPlanItemStatus> = {
  pending:     "scheduled",
  scheduled:   "in_progress",
  in_progress: "completed",
  completed:   "completed",
  cancelled:   "cancelled",
};

export function TreatmentPlanDetailsSidebar({
  plan, open, onOpenChange, onChangeStatus, onUpdateItemProgress, fetchItems,
}: Props) {
  const [items, setItems] = useState<TreatmentPlanItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  useEffect(() => {
    if (plan?.id && open) {
      setLoadingItems(true);
      fetchItems(plan.id).then((data) => {
        setItems(data);
        setLoadingItems(false);
      });
    }
  }, [plan?.id, open]);

  if (!plan) return null;

  const fmtCurrency = (v: number | null) =>
    (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalSessions = items.reduce((s, i) => s + i.sessions_total, 0);
  const completedSessions = items.reduce((s, i) => s + i.sessions_completed, 0);
  const progressPercent = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  const handleStatusChange = async (next: TreatmentPlanStatus) => {
    setChangingStatus(true);
    try {
      await onChangeStatus(plan.id, next);
    } finally {
      setChangingStatus(false);
    }
  };

  const handleItemAdvance = async (item: TreatmentPlanItem) => {
    if (item.status === "completed" || item.status === "cancelled") return;
    const newCompleted = Math.min(item.sessions_completed + 1, item.sessions_total);
    const newStatus: TreatmentPlanItemStatus =
      newCompleted >= item.sessions_total ? "completed" : "in_progress";
    await onUpdateItemProgress(item.id, newCompleted, newStatus);
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, sessions_completed: newCompleted, status: newStatus }
          : i
      )
    );
  };

  const transitions = STATUS_TRANSITIONS[plan.status] ?? [];

  const itemStatusColor: Record<TreatmentPlanItemStatus, string> = {
    pending:     "text-muted-foreground",
    scheduled:   "text-blue-500",
    in_progress: "text-yellow-500",
    completed:   "text-green-500",
    cancelled:   "text-destructive",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[680px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">
                  {plan.plan_number}
                </span>
                <Badge variant={PLAN_STATUS_VARIANTS[plan.status]}>
                  {PLAN_STATUS_LABELS[plan.status]}
                </Badge>
              </div>
              <SheetTitle className="text-xl">
                {plan.title || `Orçamento — ${plan.patient?.full_name ?? ""}`}
              </SheetTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {plan.patient?.full_name}
              </p>
            </div>

            {transitions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" disabled={changingStatus}>
                    Ações
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {transitions.map((t) => (
                    <DropdownMenuItem
                      key={t.next}
                      onClick={() => handleStatusChange(t.next)}
                    >
                      <t.icon className="mr-2 h-4 w-4" />
                      {t.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </SheetHeader>

        {/* Progresso geral */}
        {plan.status === "in_progress" && totalSessions > 0 && (
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso do tratamento</span>
              <span>{completedSessions}/{totalSessions} sessões</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        <Tabs defaultValue="items" className="mt-5">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="items">
              <FileText className="h-4 w-4 mr-1" />
              Procedimentos
            </TabsTrigger>
            <TabsTrigger value="financeiro">
              <DollarSign className="h-4 w-4 mr-1" />
              Financeiro
            </TabsTrigger>
          </TabsList>

          {/* ABA PROCEDIMENTOS */}
          <TabsContent value="items" className="mt-4 space-y-3">
            {loadingItems ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Carregando...
              </p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum procedimento neste orçamento.
              </p>
            ) : (
              items.map((item) => {
                const canAdvance =
                  plan.status === "in_progress" &&
                  item.status !== "completed" &&
                  item.status !== "cancelled";
                const itemProgress =
                  item.sessions_total > 0
                    ? Math.round((item.sessions_completed / item.sessions_total) * 100)
                    : 0;

                return (
                  <Card key={item.id}>
                    <CardContent className="pt-4 pb-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {item.description ?? item.procedure?.name ?? "Procedimento"}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                            {item.tooth_number && <span>Dente: {item.tooth_number}</span>}
                            {item.body_region && <span>Região: {item.body_region}</span>}
                            <span className={itemStatusColor[item.status]}>
                              {ITEM_STATUS_LABELS[item.status]}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold">
                            {fmtCurrency(item.total_price)}
                          </p>
                          {item.discount_percent > 0 && (
                            <p className="text-xs text-muted-foreground">
                              -{item.discount_percent}%
                            </p>
                          )}
                        </div>
                      </div>

                      {item.sessions_total > 1 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Sessões</span>
                            <span>{item.sessions_completed}/{item.sessions_total}</span>
                          </div>
                          <Progress value={itemProgress} className="h-1.5" />
                        </div>
                      )}

                      {canAdvance && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-7"
                          onClick={() => handleItemAdvance(item)}
                        >
                          Registrar sessão concluída
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* ABA FINANCEIRO */}
          <TabsContent value="financeiro" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{fmtCurrency(plan.total_value)}</span>
                </div>
                {(plan.discount_percent ?? 0) > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Desconto ({plan.discount_percent}%)</span>
                    <span>- {fmtCurrency(plan.discount_amount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>{fmtCurrency(plan.final_value)}</span>
                </div>
                {plan.insurance_coverage != null && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Cobertura convênio</span>
                      <span>{fmtCurrency(plan.insurance_coverage)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Responsabilidade do paciente</span>
                      <span>{fmtCurrency(plan.patient_responsibility)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="space-y-2 text-sm">
              {plan.payment_type && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pagamento</span>
                  <span className="capitalize">{plan.payment_type === "private" ? "Particular" : plan.payment_type === "insurance" ? "Convênio" : plan.payment_type === "installment" ? "Parcelado" : "Financiamento"}</span>
                </div>
              )}
              {plan.payment_conditions && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Condições</span>
                  <span>{plan.payment_conditions}</span>
                </div>
              )}
              {plan.insurance?.name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Convênio</span>
                  <span>{plan.insurance.name}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              {plan.created_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criado em</span>
                  <span>{format(new Date(plan.created_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              )}
              {plan.approved_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aprovado em</span>
                  <span>{format(new Date(plan.approved_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              )}
              {plan.validity_days && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Validade</span>
                  <span>{plan.validity_days} dias</span>
                </div>
              )}
            </div>

            {plan.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Observações</p>
                  <p className="text-sm text-muted-foreground">{plan.notes}</p>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
