import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Search, FileText, MoreHorizontal, Trash2,
  CheckCircle, Clock, PlayCircle,
} from "lucide-react";
import { useTreatmentPlans } from "@/hooks/useTreatmentPlans";
import { usePatients } from "@/hooks/usePatients";
import { NewTreatmentPlanDialog } from "@/components/treatment-plans/NewTreatmentPlanDialog";
import { TreatmentPlanDetailsSidebar } from "@/components/treatment-plans/TreatmentPlanDetailsSidebar";
import {
  TreatmentPlanWithDetails,
  TreatmentPlanStatus,
  PLAN_STATUS_LABELS,
  PLAN_STATUS_VARIANTS,
} from "@/types/treatmentPlans";

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "draft", label: "Rascunho" },
  { value: "pending_approval", label: "Aguardando Aprovação" },
  { value: "approved", label: "Aprovado" },
  { value: "in_progress", label: "Em Andamento" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];

export default function TreatmentPlans() {
  const {
    plans, procedures, loading, totalValue,
    createPlan, changeStatus, updateItemProgress,
    fetchPlanItems, deletePlan, getByStatus,
  } = useTreatmentPlans();
  const { patients, insurances } = usePatients();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlanWithDetails | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filtered = plans.filter((p) => {
    const matchSearch =
      !search ||
      p.patient?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.plan_number ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.title ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const fmtCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const kpis = [
    {
      label: "Total de Orçamentos",
      value: plans.length,
      icon: FileText,
      color: "text-primary",
    },
    {
      label: "Aguardando Aprovação",
      value: getByStatus("pending_approval").length,
      icon: Clock,
      color: "text-yellow-500",
    },
    {
      label: "Em Andamento",
      value: getByStatus("in_progress").length,
      icon: PlayCircle,
      color: "text-blue-500",
    },
    {
      label: "Concluídos",
      value: getByStatus("completed").length,
      icon: CheckCircle,
      color: "text-green-500",
    },
  ];

  const openPlan = (plan: TreatmentPlanWithDetails) => {
    setSelectedPlan(plan);
    setSidebarOpen(true);
  };

  const handleStatusChange = async (id: string, status: TreatmentPlanStatus) => {
    await changeStatus(id, status);
    setSelectedPlan((prev) => (prev?.id === id ? { ...prev, status } : prev));
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Orçamentos</h1>
            <p className="text-muted-foreground text-sm">
              {plans.length} orçamento{plans.length !== 1 ? "s" : ""} · {fmtCurrency(totalValue)} em aberto
            </p>
          </div>
          <Button onClick={() => setNewDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Orçamento
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por paciente ou número..."
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum orçamento encontrado.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((plan) => (
                  <TableRow
                    key={plan.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openPlan(plan)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {plan.plan_number ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {plan.patient?.full_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {plan.title ?? "—"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {fmtCurrency(plan.final_value ?? 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={PLAN_STATUS_VARIANTS[plan.status]}>
                        {PLAN_STATUS_LABELS[plan.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {plan.created_date
                        ? format(new Date(plan.created_date), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openPlan(plan)}>
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deletePlan(plan.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <NewTreatmentPlanDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        patients={patients}
        procedures={procedures}
        insurances={insurances}
        onSave={createPlan}
      />

      <TreatmentPlanDetailsSidebar
        plan={selectedPlan}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        onChangeStatus={handleStatusChange}
        onUpdateItemProgress={updateItemProgress}
        fetchItems={fetchPlanItems}
      />
    </AppLayout>
  );
}
