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
  Flame,
  Droplets,
  Snowflake,
  Award,
  ArrowUpDown,
  Tag,
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
  const [scoreFilter, setScoreFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showNewDealDialog, setShowNewDealDialog] = useState(false);
  const [dealLead, setDealLead] = useState<Lead | null>(null);

  // Score stats computed from leads
  const scoreStats = {
    hot: leads.filter((l) => l.score_grade === "hot").length,
    warm: leads.filter((l) => l.score_grade === "warm").length,
    cold: leads.filter((l) => !l.score_grade || l.score_grade === "cold").length,
    avgScore: leads.length > 0 ? Math.round(leads.reduce((sum, l) => sum + (l.lead_score || 0), 0) / leads.length) : 0,
  };

  // Filter + sort leads
  const filteredLeads = leads
    .filter((lead) => {
      const matchesScore = scoreFilter === "all" || lead.score_grade === scoreFilter;
      const matchesTag = tagFilter === "all" || lead.tags?.some(t => t.id === tagFilter);
      return matchesScore && matchesTag;
    })
    .sort((a, b) => {
      if (sortBy === "score") return (b.lead_score || 0) - (a.lead_score || 0);
      if (sortBy === "bant_score") return (b.bant_score || 0) - (a.bant_score || 0);
      if (sortBy === "company_name") return (a.company_name || "").localeCompare(b.company_name || "");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

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

        {/* Score Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="cursor-pointer hover:ring-2 hover:ring-destructive/50 transition-all" onClick={() => setScoreFilter(scoreFilter === "hot" ? "all" : "hot")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Flame className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quentes</p>
                  <p className="text-2xl font-bold">{scoreStats.hot}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:ring-2 hover:ring-yellow-500/50 transition-all" onClick={() => setScoreFilter(scoreFilter === "warm" ? "all" : "warm")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Droplets className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mornos</p>
                  <p className="text-2xl font-bold">{scoreStats.warm}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all" onClick={() => setScoreFilter(scoreFilter === "cold" ? "all" : "cold")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Snowflake className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Frios</p>
                  <p className="text-2xl font-bold">{scoreStats.cold}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Award className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Score Médio</p>
                  <p className="text-2xl font-bold">{scoreStats.avgScore}</p>
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

           <div className="flex gap-2 items-center">
            {/* Sort dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Mais recente</SelectItem>
                <SelectItem value="score">Maior score</SelectItem>
                <SelectItem value="bant_score">Maior BANT</SelectItem>
                <SelectItem value="company_name">Empresa (A-Z)</SelectItem>
              </SelectContent>
            </Select>

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

              <Select value={scoreFilter} onValueChange={setScoreFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Scores</SelectItem>
                  <SelectItem value="hot">🔥 Quentes</SelectItem>
                  <SelectItem value="warm">💧 Mornos</SelectItem>
                  <SelectItem value="cold">❄️ Frios</SelectItem>
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
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger>
                      <Tag className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Tags</SelectItem>
                      {tags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

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
            leads={filteredLeads}
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
            leads={filteredLeads}
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
