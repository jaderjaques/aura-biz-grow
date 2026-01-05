import { format, formatDistanceToNow } from "date-fns";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Eye, FileText, Receipt, TrendingUp } from "lucide-react";
import { CustomerWithDetails, CustomerStatus } from "@/types/customers";

interface CustomersTableProps {
  customers: CustomerWithDetails[];
  onView: (customer: CustomerWithDetails) => void;
  onViewContracts: (customerId: string) => void;
}

export function CustomersTable({
  customers,
  onView,
  onViewContracts,
}: CustomersTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: CustomerStatus) => {
    const statusConfig: Record<CustomerStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Ativo", variant: "default" },
      inactive: { label: "Inativo", variant: "secondary" },
      suspended: { label: "Suspenso", variant: "outline" },
      cancelled: { label: "Cancelado", variant: "destructive" },
    };

    const config = statusConfig[status] || statusConfig.inactive;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (customers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum cliente encontrado.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Contato</TableHead>
          <TableHead>Segmento</TableHead>
          <TableHead>MRR</TableHead>
          <TableHead>LTV</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Responsável</TableHead>
          <TableHead>Cliente Desde</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow
            key={customer.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onView(customer)}
          >
            <TableCell>
              <div>
                <p className="font-medium">{customer.company_name}</p>
                <p className="text-xs text-muted-foreground">{customer.cnpj}</p>
              </div>
            </TableCell>
            <TableCell>
              <div>
                <p className="text-sm">{customer.contact_name}</p>
                <p className="text-xs text-muted-foreground">{customer.phone}</p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{customer.segment || "-"}</Badge>
            </TableCell>
            <TableCell>
              <p className="font-medium text-primary">
                {formatCurrency(Number(customer.monthly_value || 0))}/mês
              </p>
            </TableCell>
            <TableCell>
              <p className="text-sm">
                {formatCurrency(Number(customer.lifetime_value || 0))}
              </p>
            </TableCell>
            <TableCell>{getStatusBadge(customer.status as CustomerStatus)}</TableCell>
            <TableCell>
              {customer.account_manager_user ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={customer.account_manager_user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(customer.account_manager_user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {customer.account_manager_user.full_name}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {customer.customer_since
                  ? format(new Date(customer.customer_since), "dd/MM/yyyy")
                  : "-"}
              </span>
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(customer)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewContracts(customer.id)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Contratos
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Receipt className="mr-2 h-4 w-4" />
                    Faturas
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Oferecer Upgrade
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
