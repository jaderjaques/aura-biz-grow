import { useState } from "react";
import { format } from "date-fns";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, RefreshCw, Plus, FileText } from "lucide-react";
import { useContracts } from "@/hooks/useCustomers";
import { ContractWithDetails } from "@/types/customers";
import { EditContractDialog } from "./EditContractDialog";
import { NewServiceDialog } from "./NewServiceDialog";

interface CustomerContractsTabProps {
  customerId: string;
  customerName: string;
}

export function CustomerContractsTab({ customerId, customerName }: CustomerContractsTabProps) {
  const { contracts, loading, fetchContracts } = useContracts(customerId);

  const [editingContract, setEditingContract] = useState<ContractWithDetails | null>(null);
  const [showNewService, setShowNewService] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Rascunho", variant: "outline" },
      sent: { label: "Enviado", variant: "secondary" },
      pending_signature: { label: "Aguardando Assinatura", variant: "secondary" },
      signed: { label: "Assinado", variant: "default" },
      active: { label: "Ativo", variant: "default" },
      suspended: { label: "Suspenso", variant: "destructive" },
      cancelled: { label: "Cancelado", variant: "destructive" },
      expired: { label: "Expirado", variant: "outline" },
    };

    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getBillingCycleLabel = (cycle: string) => {
    const cycles: Record<string, string> = {
      monthly: "Mensal",
      quarterly: "Trimestral",
      semiannual: "Semestral",
      annual: "Anual",
    };
    return cycles[cycle] || cycle;
  };

  const handleNewService = () => {
    setShowNewService(true);
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando contratos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Serviços/Contratos ({contracts.length})</h3>
        <Button size="sm" onClick={handleNewService}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Serviço
        </Button>
      </div>

      {contracts.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          Nenhum contrato encontrado para este cliente.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contrato</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>MRR</TableHead>
              <TableHead>Ciclo</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Renovação</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell className="font-medium">{contract.contract_number}</TableCell>
                <TableCell>{contract.title}</TableCell>
                <TableCell className="font-semibold text-primary">
                  {formatCurrency(Number(contract.recurring_value || 0))}/mês
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getBillingCycleLabel(contract.billing_cycle || "monthly")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {contract.start_date && format(new Date(contract.start_date), "dd/MM/yyyy")}
                    {contract.end_date && (
                      <>
                        <span className="text-muted-foreground"> → </span>
                        {format(new Date(contract.end_date), "dd/MM/yyyy")}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(contract.status || "draft")}
                </TableCell>
                <TableCell>
                  {contract.auto_renew && (
                    <div className="flex items-center gap-1 text-sm text-primary">
                      <RefreshCw className="h-4 w-4" />
                      Auto
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingContract(contract)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <FileText className="mr-2 h-4 w-4" />
                        Ver Contrato
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <EditContractDialog
        open={!!editingContract}
        onOpenChange={(open) => !open && setEditingContract(null)}
        contract={editingContract}
        onSuccess={() => fetchContracts()}
      />

      <NewServiceDialog
        open={showNewService}
        onOpenChange={setShowNewService}
        customerId={customerId}
        customerName={customerName}
        onSuccess={() => fetchContracts()}
      />
    </div>
  );
}
