import { useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLeads } from "@/hooks/useLeads";
import { useDeals } from "@/hooks/useDeals";
import { useAuth } from "@/contexts/AuthContext";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadsKanban } from "@/components/leads/LeadsKanban";
import { NewLeadDialog } from "@/components/leads/NewLeadDialog";
import { ImportCSVDialog } from "@/components/leads/ImportCSVDialog";
import { LeadDetailsSidebar } from "@/components/leads/LeadDetailsSidebar";
import { NewDealDialog } from "@/components/deals/NewDealDialog";
import { Lead } from "@/types/leads";
import { SelectedProduct } from "@/types/products";
import {
  Users,
  UserPlus,
  Target,
  Eye,
  Plus,
  Upload,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Leads() {
  const {
    leads,
    stages,
    tags,
    loading,
    metrics,
    fetchLeads,
    fetchMetrics,
    updateLeadStage,
    deleteLead,
    importLeads,
  } = useLeads();
  const { createDeal } = useDeals();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showNewDealDialog, setShowNewDealDialog] = useState(false);
  const [dealLead, setDealLead] = useState<Lead | null>(null);

  const handleSearch = useCallback(() => {
    fetchLeads({
      search: searchTerm,
      status: statusFilter,
      source: sourceFilter,
    });
  }, [fetchLeads, searchTerm, statusFilter, sourceFilter]);

  const handleOpenLead = (id: string) => {
    setSelectedLeadId(id);
    setShowLeadDetails(true);
  };

  const handleMoveStage = async (leadId: string, fromStage: string, toStage: string) => {
    const success = await updateLeadStage(leadId, fromStage, toStage);
    if (success) {
      fetchLeads();
      fetchMetrics();
    }
  };

  const handleDeleteLead = async (id: string) => {
    const success = await deleteLead(id);
    if (success) {
      fetchLeads();
      fetchMetrics();
    }
  };

  const handleImportLeads = async (leadsData: Array<{
    company_name: string;
    phone: string;
    email?: string;
    contact_name?: string;
    position?: string;
    segment?: string;
  }>) => {
    await importLeads(leadsData);
    fetchLeads();
    fetchMetrics();
  };

  const handleSelectLead = (id: string, selected: boolean) => {
    setSelectedLeads((prev) =>
      selected ? [...prev, id] : prev.filter((leadId) => leadId !== id)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedLeads(selected ? leads.map((l) => l.id) : []);
  };

  const handleCreateDealFromLead = (lead: Lead) => {
    setDealLead(lead);
    setShowNewDealDialog(true);
    setShowLeadDetails(false);
  };

  const handleDealCreated = async (dealData: any, products: SelectedProduct[]) => {
    await createDeal(dealData, products);
    setShowNewDealDialog(false);
    setDealLead(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header with metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{metrics.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Sparkles className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Novos (hoje)</p>
                  <p className="text-2xl font-bold">{metrics.newToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Target className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Qualificados</p>
                  <p className="text-2xl font-bold">{metrics.qualified}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Eye className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Não visualizados</p>
                  <p className="text-2xl font-bold">{metrics.unviewed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <Button
              onClick={() => setShowNewLeadDialog(true)}
              className="gradient-cta text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Lead
            </Button>
            {isAdmin && (
              <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Importar CSV
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "table" | "kanban")}
            >
              <TabsList>
                <TabsTrigger value="kanban">
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="table">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por empresa, contato, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="novo">Novos</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="qualificado">Qualificados</SelectItem>
                  <SelectItem value="descartado">Descartados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="google_maps">Google Maps</SelectItem>
                  <SelectItem value="website_form">Website</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="csv_import">CSV</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={handleSearch}>
                Buscar
              </Button>
            </div>

            <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filtros Avançados
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinica">Clínicas</SelectItem>
                      <SelectItem value="escritorio">Escritórios</SelectItem>
                      <SelectItem value="consultoria">Consultorias</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Score" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alto (70-100)</SelectItem>
                      <SelectItem value="medium">Médio (40-69)</SelectItem>
                      <SelectItem value="low">Baixo (0-39)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="unassigned">Não atribuído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : viewMode === "table" ? (
          <LeadsTable
            leads={leads}
            selectedLeads={selectedLeads}
            onSelectLead={handleSelectLead}
            onSelectAll={handleSelectAll}
            onOpenLead={handleOpenLead}
            onEditLead={handleOpenLead}
            onAssignLead={handleOpenLead}
            onAddActivity={handleOpenLead}
            onDeleteLead={handleDeleteLead}
          />
        ) : (
          <LeadsKanban
            leads={leads}
            stages={stages}
            onOpenLead={handleOpenLead}
            onMoveStage={handleMoveStage}
          />
        )}
      </div>

      {/* Dialogs */}
      <NewLeadDialog
        open={showNewLeadDialog}
        onOpenChange={setShowNewLeadDialog}
        onSuccess={() => {
          fetchLeads();
          fetchMetrics();
        }}
        tags={tags}
      />

      <ImportCSVDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImportLeads}
      />

      <LeadDetailsSidebar
        leadId={selectedLeadId}
        open={showLeadDetails}
        onOpenChange={setShowLeadDetails}
        onEdit={handleOpenLead}
        onDelete={handleDeleteLead}
        onRefresh={() => {
          fetchLeads();
          fetchMetrics();
        }}
        onCreateDeal={handleCreateDealFromLead}
      />

      <NewDealDialog
        open={showNewDealDialog}
        onOpenChange={setShowNewDealDialog}
        onSubmit={handleDealCreated}
        lead={dealLead}
      />
    </AppLayout>
  );
}
