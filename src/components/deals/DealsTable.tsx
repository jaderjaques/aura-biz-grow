import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Eye, FileText, CheckCircle, XCircle } from "lucide-react";
import { DealWithDetails, getDealTotal } from "@/types/products";

interface DealsTableProps {
  deals: DealWithDetails[];
  onView: (deal: DealWithDetails) => void;
  onGenerateQuote: (dealId: string) => void;
  onMarkAsWon: (dealId: string) => void;
  onMarkAsLost: (dealId: string) => void;
}

export function DealsTable({
  deals,
  onView,
  onGenerateQuote,
  onMarkAsWon,
  onMarkAsLost,
}: DealsTableProps) {
  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "proposta":
        return "bg-blue-500";
      case "negociacao":
        return "bg-yellow-500";
      case "ganho":
        return "bg-green-500";
      case "perdido":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case "proposta":
        return "Proposta";
      case "negociacao":
        return "Negociação";
      case "ganho":
        return "Ganho";
      case "perdido":
        return "Perdido";
      default:
        return stage;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Número</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Valor Total</TableHead>
          <TableHead>MRR</TableHead>
          <TableHead>Etapa</TableHead>
          <TableHead>Probabilidade</TableHead>
          <TableHead>Criado</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deals.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
              Nenhuma proposta encontrada
            </TableCell>
          </TableRow>
        ) : (
          deals.map((deal) => (
            <TableRow
              key={deal.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onView(deal)}
            >
              <TableCell>
                <Badge variant="outline">{deal.deal_number}</Badge>
              </TableCell>

              <TableCell>
                <div>
                  <p className="font-medium">{deal.lead?.company_name || "-"}</p>
                  <p className="text-xs text-muted-foreground">
                    {deal.lead?.contact_name}
                  </p>
                </div>
              </TableCell>

              <TableCell>
                <p className="font-semibold">{formatCurrency(getDealTotal(deal))}</p>
              </TableCell>

              <TableCell>
                {Number(deal.recurring_value) > 0 ? (
                  <Badge className="bg-green-600">
                    +{formatCurrency(Number(deal.recurring_value))}/mês
                  </Badge>
                ) : (
                  "-"
                )}
              </TableCell>

              <TableCell>
                <Badge className={getStageColor(deal.stage || "proposta")}>
                  {getStageLabel(deal.stage || "proposta")}
                </Badge>
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={deal.probability || 0} className="w-16 h-2" />
                  <span className="text-sm">{deal.probability}%</span>
                </div>
              </TableCell>

              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(deal.created_at!), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </TableCell>

              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onView(deal)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onGenerateQuote(deal.id)}>
                      <FileText className="mr-2 h-4 w-4" />
                      Gerar Proposta PDF
                    </DropdownMenuItem>
                    {deal.status === "open" && (
                      <>
                        <DropdownMenuItem onClick={() => onMarkAsWon(deal.id)}>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                          Marcar como Ganho
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMarkAsLost(deal.id)}>
                          <XCircle className="mr-2 h-4 w-4 text-red-600" />
                          Marcar como Perdido
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
