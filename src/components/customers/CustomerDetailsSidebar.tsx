import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  User,
  Phone,
  Mail,
  Globe,
  MapPin,
  DollarSign,
  TrendingUp,
  Calendar,
  Receipt,
  FileText,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CustomerWithDetails, CustomerStatus } from "@/types/customers";
import { CustomerInvoicesTab } from "./CustomerInvoicesTab";
import { CustomerContractsTab } from "./CustomerContractsTab";

interface CustomerDetailsSidebarProps {
  customer: CustomerWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailsSidebar({
  customer,
  open,
  onOpenChange,
}: CustomerDetailsSidebarProps) {
  if (!customer) return null;

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[700px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">{customer.company_name}</SheetTitle>
            {getStatusBadge(customer.status as CustomerStatus)}
          </div>
          {customer.trading_name && (
            <p className="text-sm text-muted-foreground">{customer.trading_name}</p>
          )}
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">
              <Building2 className="h-4 w-4 mr-1" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <Receipt className="h-4 w-4 mr-1" />
              Faturas
            </TabsTrigger>
            <TabsTrigger value="contracts">
              <FileText className="h-4 w-4 mr-1" />
              Serviços
            </TabsTrigger>
          </TabsList>

          {/* Informações Tab */}
          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Métricas Financeiras */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">MRR</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(Number(customer.monthly_value || 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground">LTV</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(Number(customer.lifetime_value || 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Contato */}
            <div className="space-y-3">
              <h4 className="font-semibold">Contato Principal</h4>
              
              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.contact_name}</span>
                  {customer.position && (
                    <Badge variant="outline" className="ml-2">{customer.position}</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>

                {customer.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={customer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {customer.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Dados da Empresa */}
            <div className="space-y-3">
              <h4 className="font-semibold">Dados da Empresa</h4>
              
              <div className="grid gap-2 text-sm">
                {customer.cnpj && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CNPJ:</span>
                    <span>{customer.cnpj}</span>
                  </div>
                )}
                
                {customer.segment && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Segmento:</span>
                    <Badge variant="outline">{customer.segment}</Badge>
                  </div>
                )}

                {customer.company_size && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Porte:</span>
                    <span>{customer.company_size}</span>
                  </div>
                )}

                {customer.employee_count && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Funcionários:</span>
                    <span>{customer.employee_count}</span>
                  </div>
                )}

                {customer.customer_since && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente desde:</span>
                    <span>{format(new Date(customer.customer_since), "dd/MM/yyyy")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Endereço */}
            {(customer.street || customer.city) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </h4>
                  <p className="text-sm">
                    {[
                      customer.street,
                      customer.number,
                      customer.complement,
                      customer.neighborhood,
                      customer.city,
                      customer.state,
                      customer.zip_code,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </>
            )}

            {/* Responsável */}
            {customer.account_manager_user && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-semibold">Responsável pela Conta</h4>
                  <p className="text-sm">{customer.account_manager_user.full_name}</p>
                </div>
              </>
            )}

            {/* Notas */}
            {customer.notes && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-semibold">Observações</h4>
                  <p className="text-sm text-muted-foreground">{customer.notes}</p>
                </div>
              </>
            )}
          </TabsContent>

          {/* Faturas Tab */}
          <TabsContent value="invoices" className="mt-4">
            <CustomerInvoicesTab customerId={customer.id} />
          </TabsContent>

          {/* Contratos Tab */}
          <TabsContent value="contracts" className="mt-4">
            <CustomerContractsTab
              customerId={customer.id}
              customerName={customer.company_name}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
