import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DealWithDetails } from "@/types/products";
import {
  Building,
  User,
  DollarSign,
  Calendar,
  Package,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";

interface DealDetailsSheetProps {
  deal: DealWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsWon: (deal: DealWithDetails) => void;
  onMarkAsLost: (dealId: string) => void;
  onGenerateQuote: (dealId: string) => void;
}

export function DealDetailsSheet({
  deal,
  isOpen,
  onClose,
  onMarkAsWon,
  onMarkAsLost,
  onGenerateQuote,
}: DealDetailsSheetProps) {
  if (!deal) return null;

  const setupValue = Number(deal.setup_value) || 0;
  const recurringValue = Number(deal.recurring_value) || 0;
  const totalValue = Number(deal.total_value) || 0;

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "proposta": return "bg-blue-500";
      case "negociacao": return "bg-yellow-500";
      case "ganho": return "bg-green-500";
      case "perdido": return "bg-red-500";
      default: return "bg-muted";
    }
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      proposta: "Proposta",
      negociacao: "Negociação",
      ganho: "Ganho",
      perdido: "Perdido",
    };
    return labels[stage] || stage;
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{deal.title}</SheetTitle>
          <div className="flex items-center gap-2">
            <Badge className={getStageColor(deal.stage || "proposta")}>
              {getStageLabel(deal.stage || "proposta")}
            </Badge>
            {deal.deal_number && (
              <Badge variant="outline">{deal.deal_number}</Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Client info */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Building className="h-4 w-4" /> Cliente
            </h3>
            <div className="text-sm space-y-1 pl-6">
              <p>{deal.lead?.company_name || "—"}</p>
              {deal.lead?.contact_name && (
                <p className="text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> {deal.lead.contact_name}
                </p>
              )}
              {deal.lead?.email && (
                <p className="text-muted-foreground">{deal.lead.email}</p>
              )}
              {deal.lead?.phone && (
                <p className="text-muted-foreground">{deal.lead.phone}</p>
              )}
            </div>
          </section>

          <Separator />

          {/* Values */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Valores
            </h3>
            <div className="pl-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Valor Total</span>
                <span className="font-bold text-primary">{formatCurrency(totalValue)}</span>
              </div>
              {setupValue > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Setup</span>
                  <span>{formatCurrency(setupValue)}</span>
                </div>
              )}
              {recurringValue > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mensalidade</span>
                  <span>{formatCurrency(recurringValue)}/mês</span>
                </div>
              )}
              {(Number(deal.discount_total) || 0) > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Desconto</span>
                  <span>-{formatCurrency(Number(deal.discount_total))}</span>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Products */}
          {deal.deal_products && deal.deal_products.length > 0 && (
            <>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" /> Produtos/Serviços
                </h3>
                <div className="pl-6 space-y-1">
                  {deal.deal_products.map((dp) => (
                    <div key={dp.id} className="flex justify-between text-sm">
                      <span>{dp.product?.name}</span>
                      <span className="text-muted-foreground">
                        {dp.quantity}x {formatCurrency(Number(dp.unit_price))}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <Separator />
            </>
          )}

          {/* Dates */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Datas
            </h3>
            <div className="pl-6 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado</span>
                <span>
                  {deal.created_at
                    ? format(new Date(deal.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "—"}
                </span>
              </div>
              {deal.expected_close_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fechamento Previsto</span>
                  <span>{format(new Date(deal.expected_close_date), "dd/MM/yyyy")}</span>
                </div>
              )}
              {deal.actual_close_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fechamento Real</span>
                  <span>{format(new Date(deal.actual_close_date), "dd/MM/yyyy")}</span>
                </div>
              )}
            </div>
          </section>

          {/* Assigned */}
          {deal.assigned_user && (
            <>
              <Separator />
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Responsável</h3>
                <p className="text-sm pl-6">{deal.assigned_user.full_name}</p>
              </section>
            </>
          )}

          {/* Notes */}
          {deal.notes && (
            <>
              <Separator />
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Observações</h3>
                <p className="text-sm pl-6 text-muted-foreground whitespace-pre-wrap">
                  {deal.notes}
                </p>
              </section>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGenerateQuote(deal.id)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Gerar Proposta PDF
            </Button>
            {deal.status === "open" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => onMarkAsWon(deal)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Marcar Ganho
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => onMarkAsLost(deal.id)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Marcar Perdido
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}
