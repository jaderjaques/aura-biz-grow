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
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User, FileText, DollarSign, ChevronDown,
  CheckCircle, Clock, XCircle, PlayCircle,
  Receipt, ExternalLink, Loader2, Ban,
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
import { NfseEmission, NFSE_STATUS_LABELS, NFSE_STATUS_COLORS } from "@/types/nfse";
import { useNfseByPlan, useCancelNfse } from "@/hooks/useNfse";
import { GenerateNfseDialog } from "./GenerateNfseDialog";

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

// Orçamentos onde faz sentido emitir NFS-e
const NFSE_ELIGIBLE_STATUSES: TreatmentPlanStatus[] = ["approved", "in_progress", "completed"];

export function TreatmentPlanDetailsSidebar({
  plan, open, onOpenChange, onChangeStatus, onUpdateItemProgress, fetchItems,
}: Props) {
  const [items, setItems] = useState<TreatmentPlanItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [nfseDialogOpen, setNfseDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<NfseEmission | null>(null);

  const { data: nfseEmissions = [], isLoading: loadingNfse } = useNfseByPlan(
    open ? (plan?.id ?? null) : null
  );
  const { mutateAsync: cancelNfse, isPending: cancelling } = useCancelNfse();

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
  const canGenerateNfse = NFSE_ELIGIBLE_STATUSES.includes(plan.status);

  // Verificar se já existe uma NFS-e emitida ou pendente
  const hasActiveNfse = nfseEmissions.some(
    (e) => e.status === "emitted" || e.status === "pending" || e.status === "processing"
  );

  const itemStatusColor: Record<TreatmentPlanItemStatus, string> = {
    pending:     "text-muted-foreground",
    scheduled:   "text-blue-500",
    in_progress: "text-yellow-500",
    completed:   "text-green-500",
    cancelled:   "text-destructive",
  };

  return (
    <>
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

              <div className="flex items-center gap-2 shrink-0">
                {/* Botão Gerar NFS-e */}
                {canGenerateNfse && (
                  <Button
                    size="sm"
                    variant={hasActiveNfse ? "outline" : "default"}
                    onClick={() => setNfseDialogOpen(true)}
                    className={!hasActiveNfse ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                  >
                    <Receipt className="h-3.5 w-3.5 mr-1.5" />
                    {hasActiveNfse ? "Nova NFS-e" : "Gerar NFS-e"}
                  </Button>
                )}

                {/* Ações de status */}
                {transitions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" disabled={changingStatus}>
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="items">
                <FileText className="h-4 w-4 mr-1" />
                Procedimentos
              </TabsTrigger>
              <TabsTrigger value="financeiro">
                <DollarSign className="h-4 w-4 mr-1" />
                Financeiro
              </TabsTrigger>
              <TabsTrigger value="nfse" className="relative">
                <Receipt className="h-4 w-4 mr-1" />
                NFS-e
                {nfseEmissions.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
                    {nfseEmissions.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── ABA PROCEDIMENTOS ── */}
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

            {/* ── ABA FINANCEIRO ── */}
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
                    <span className="capitalize">
                      {plan.payment_type === "private"     ? "Particular"
                       : plan.payment_type === "insurance"  ? "Convênio"
                       : plan.payment_type === "installment"? "Parcelado"
                       : "Financiamento"}
                    </span>
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

            {/* ── ABA NFS-e ── */}
            <TabsContent value="nfse" className="mt-4 space-y-4">
              {/* Botão para gerar (dentro da aba também) */}
              {canGenerateNfse && (
                <Button
                  size="sm"
                  onClick={() => setNfseDialogOpen(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Gerar Nova NFS-e para este Orçamento
                </Button>
              )}

              {loadingNfse ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando emissões...
                </div>
              ) : nfseEmissions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm space-y-2">
                  <Receipt className="h-10 w-10 mx-auto opacity-20" />
                  <p>Nenhuma NFS-e emitida para este orçamento.</p>
                  {!canGenerateNfse && (
                    <p className="text-xs">
                      Aprove o orçamento para habilitar a emissão.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {nfseEmissions.map((emission) => (
                    <Card key={emission.id}>
                      <CardContent className="pt-4 pb-3 space-y-3">
                        {/* Header do card */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            {emission.numero_nfse ? (
                              <p className="font-semibold text-sm">
                                NFS-e nº {emission.numero_nfse}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground font-mono">
                                {emission.id.substring(0, 8)}...
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Solicitado em{" "}
                              {format(new Date(emission.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${NFSE_STATUS_COLORS[emission.status]}`}
                          >
                            {NFSE_STATUS_LABELS[emission.status]}
                          </span>
                        </div>

                        {/* Dados */}
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex justify-between">
                            <span>Valor dos serviços</span>
                            <span className="font-medium text-foreground">
                              {fmtCurrency(emission.valor_servicos)}
                            </span>
                          </div>
                          {emission.valor_iss != null && (
                            <div className="flex justify-between">
                              <span>ISS ({emission.aliquota_iss}%)</span>
                              <span>{fmtCurrency(emission.valor_iss)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Competência</span>
                            <span>
                              {format(new Date(emission.competencia + "T12:00:00"), "MM/yyyy")}
                            </span>
                          </div>
                          {emission.codigo_verificacao && (
                            <div className="flex justify-between">
                              <span>Código de verificação</span>
                              <span className="font-mono">{emission.codigo_verificacao}</span>
                            </div>
                          )}
                        </div>

                        {/* Discriminação */}
                        <div className="bg-muted/40 rounded p-2 text-xs text-muted-foreground whitespace-pre-wrap max-h-24 overflow-y-auto">
                          {emission.discriminacao}
                        </div>

                        {/* Erro */}
                        {emission.status === "error" && emission.error_message && (
                          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                            <strong>Erro:</strong> {emission.error_message}
                          </div>
                        )}

                        {/* Ações */}
                        <div className="flex items-center gap-2 pt-1">
                          {emission.link_nfse && (
                            <Button variant="outline" size="sm" className="h-7 text-xs flex-1" asChild>
                              <a href={emission.link_nfse} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Ver NFS-e
                              </a>
                            </Button>
                          )}
                          {emission.pdf_url && (
                            <Button variant="outline" size="sm" className="h-7 text-xs flex-1" asChild>
                              <a href={emission.pdf_url} target="_blank" rel="noopener noreferrer" download>
                                <FileText className="h-3 w-3 mr-1" />
                                Baixar PDF
                              </a>
                            </Button>
                          )}
                          {(emission.status === "pending" || emission.status === "error") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => setCancelTarget(emission)}
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Dialog de geração */}
      {nfseDialogOpen && (
        <GenerateNfseDialog
          open={nfseDialogOpen}
          onOpenChange={setNfseDialogOpen}
          plan={plan}
          items={items}
        />
      )}

      {/* Confirmar cancelamento */}
      <AlertDialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar solicitação de NFS-e?</AlertDialogTitle>
            <AlertDialogDescription>
              A solicitação será marcada como cancelada e não será processada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (cancelTarget) {
                  await cancelNfse({
                    id: cancelTarget.id,
                    planId: cancelTarget.treatment_plan_id,
                  });
                  setCancelTarget(null);
                }
              }}
            >
              {cancelling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Ban className="h-4 w-4 mr-1" />
              )}
              Cancelar NFS-e
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
