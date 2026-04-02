import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Search,
  Plus,
} from "lucide-react";
import { useCustomers, useContracts } from "@/hooks/useCustomers";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { CustomerDetailsSidebar } from "@/components/customers/CustomerDetailsSidebar";
import { NewCustomerDialog } from "@/components/customers/NewCustomerDialog";
import { CustomerWithDetails } from "@/types/customers";

export default function Customers() {
  const navigate = useNavigate();
  const {
    customers,
    loading,
    getActiveCustomers,
    getTotalMRR,
    getAvgLTV,
  } = useCustomers();
  const { getExpiringContracts } = useContracts();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterManager, setFilterManager] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.cnpj?.includes(searchTerm);

    const matchesStatus =
      filterStatus === "all" || customer.status === filterStatus;

    const matchesManager =
      filterManager === "all" || customer.account_manager === filterManager;

    return matchesSearch && matchesStatus && matchesManager;
  });

  const handleViewCustomer = (customer: CustomerWithDetails) => {
    setSelectedCustomer(customer);
  };

  const handleViewContracts = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
    }
  };

  // Get unique managers for filter
  const managers = Array.from(
    new Set(
      customers
        .filter((c) => c.account_manager_user)
        .map((c) => JSON.stringify(c.account_manager_user))
    )
  ).map((m) => JSON.parse(m));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                  <p className="text-2xl font-bold">
                    {getActiveCustomers().length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">MRR Total</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(getTotalMRR())}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">LTV Médio</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(getAvgLTV())}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Contratos a Vencer
                  </p>
                  <p className="text-2xl font-bold">
                    {getExpiringContracts().length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Clientes</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar clientes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                    <SelectItem value="suspended">Suspensos</SelectItem>
                    <SelectItem value="cancelled">Cancelados</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterManager} onValueChange={setFilterManager}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {managers.map((manager: any) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando clientes...
              </div>
            ) : (
              <CustomersTable
                customers={filteredCustomers}
                onView={handleViewCustomer}
                onViewContracts={handleViewContracts}
              />
            )}
          </CardContent>
        </Card>

        <CustomerDetailsSidebar
          customer={selectedCustomer}
          open={!!selectedCustomer}
          onOpenChange={(open) => !open && setSelectedCustomer(null)}
        />
      </div>
    </AppLayout>
  );
}
