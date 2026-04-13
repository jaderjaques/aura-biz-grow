import { useState } from "react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { getCurrentProfile } from "@/lib/tenant-utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  DollarSign,
  CheckCircle,
  TrendingUp,
  Plus,
  Columns,
  List,
} from "lucide-react";
import { useDeals } from "@/hooks/useDeals";
import { DealsTable } from "@/components/deals/DealsTable";
import { DealsKanban } from "@/components/deals/DealsKanban";
import { DealDetailsSheet } from "@/components/deals/DealDetailsSheet";
import { NewDealDialog } from "@/components/deals/NewDealDialog";
import { DealWonModal } from "@/components/deals/DealWonModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DealWithDetails, SelectedProduct } from "@/types/products";

export default function Deals() {
  const navigate = useNavigate();
  const {
    deals,
    loading,
    fetchDeals,
    createDeal,
    markAsLost,
    getOpenDeals,
    getTotalValue,
    getWonThisMonth,
    getConversionRate,
  } = useDeals();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filterStage, setFilterStage] = useState("all");
  const [showNewDialog, setShowNewDialog] = useState(false);

  // Details sheet
  const [selectedDeal, setSelectedDeal] = useState<DealWithDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Won modal
  const [showWonModal, setShowWonModal] = useState(false);
  const [dealToWon, setDealToWon] = useState<DealWithDetails | null>(null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const filteredDeals =
    filterStage === "all" ? deals : deals.filter((d) => d.stage === filterStage);

  const handleCreateDeal = async (dealData: any, products: SelectedProduct[]) => {
    await createDeal(dealData, products);
  };

  const handleDealClick = (deal: DealWithDetails) => {
    setSelectedDeal(deal);
    setShowDetails(true);
  };

  const handleMarkAsWon = (deal: DealWithDetails) => {
    setDealToWon(deal);
    setShowWonModal(true);
  };

  const handleGenerateQuote = async (dealId: string) => {
    try {
      const deal = deals.find((d) => d.id === dealId);
      if (!deal) return;

      const profile = await getCurrentProfile();

      const { data: quote, error } = await supabase
        .from("quotes")
        .insert({
          deal_id: dealId,
          title: `Proposta Comercial - ${deal.lead?.company_name || "Cliente"}`,
          total_value: deal.total_value,
          status: "draft",
          valid_until: addDays(new Date(), 15).toISOString().split("T")[0],
          created_by: profile.id,
          tenant_id: profile.tenant_id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      const html = generateQuoteHTML(deal, quote);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      toast({
        title: "Proposta gerada!",
        description: `${quote.quote_number} criada com sucesso`,
      });
    } catch (error: any) {
      console.error("Error generating quote:", error);
      toast({ title: "Erro ao gerar proposta", description: error.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total em Aberto</p>
                  <p className="text-2xl font-bold">{getOpenDeals().length}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(getTotalValue())}</p>
                </div>
                <DollarSign className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fechados (mês)</p>
                  <p className="text-2xl font-bold">{getWonThisMonth()}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Conversão</p>
                  <p className="text-2xl font-bold">{getConversionRate()}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <CardTitle>Propostas</CardTitle>
              <div className="flex flex-wrap gap-2 items-center">
                {/* View toggle */}
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "kanban" | "list")}>
                  <TabsList className="h-9">
                    <TabsTrigger value="kanban" className="px-3">
                      <Columns className="h-4 w-4 mr-1" />
                      Kanban
                    </TabsTrigger>
                    <TabsTrigger value="list" className="px-3">
                      <List className="h-4 w-4 mr-1" />
                      Lista
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {viewMode === "list" && (
                  <Select value={filterStage} onValueChange={setFilterStage}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Todas etapas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="proposta">Proposta</SelectItem>
                      <SelectItem value="negociacao">Negociação</SelectItem>
                      <SelectItem value="ganho">Ganho</SelectItem>
                      <SelectItem value="perdido">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <Button
                  onClick={() => setShowNewDialog(true)}
                  className="bg-gradient-to-r from-primary to-accent"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Proposta
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando propostas...
              </div>
            ) : viewMode === "kanban" ? (
              <DealsKanban
                deals={deals}
                onRefresh={fetchDeals}
                onDealClick={handleDealClick}
                onDealWon={handleMarkAsWon}
              />
            ) : (
              <DealsTable
                deals={filteredDeals}
                onView={handleDealClick}
                onGenerateQuote={handleGenerateQuote}
                onMarkAsWon={(dealId) => {
                  const deal = deals.find((d) => d.id === dealId);
                  if (deal) handleMarkAsWon(deal);
                }}
                onMarkAsLost={markAsLost}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <NewDealDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onSubmit={handleCreateDeal}
      />

      <DealDetailsSheet
        deal={selectedDeal}
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedDeal(null);
        }}
        onMarkAsWon={handleMarkAsWon}
        onMarkAsLost={markAsLost}
        onGenerateQuote={handleGenerateQuote}
      />

      <DealWonModal
        deal={dealToWon}
        isOpen={showWonModal}
        onClose={() => {
          setShowWonModal(false);
          setDealToWon(null);
        }}
        onSuccess={() => {
          fetchDeals();
          setShowWonModal(false);
          setDealToWon(null);
          navigate("/financeiro");
        }}
      />
    </AppLayout>
  );
}

// --- Quote HTML generator (kept from original) ---
function generateQuoteHTML(deal: DealWithDetails, quote: any) {
  const fmtCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const productsHTML = deal.deal_products
    ?.map(
      (dp) => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;">${dp.product?.name}</td>
        <td style="padding:12px;border-bottom:1px solid #eee;text-align:center;">${dp.quantity}</td>
        <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">${fmtCurrency(Number(dp.unit_price))}</td>
        <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">${fmtCurrency(Number(dp.total))}</td>
      </tr>`
    )
    .join("") || "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${quote.quote_number}</title>
<style>body{font-family:'Segoe UI',sans-serif;margin:40px;color:#333}.header{text-align:center;margin-bottom:40px}.logo{font-size:24px;font-weight:bold;color:#8B3A8B}.products-table{width:100%;border-collapse:collapse;margin-bottom:30px}.products-table th{background:#f5f5f5;padding:12px;text-align:left}.totals{background:linear-gradient(135deg,#8B3A8B10,#FF6B3510);padding:20px;border-radius:8px}.total-row{display:flex;justify-content:space-between;margin-bottom:8px}.total-final{font-size:24px;font-weight:bold;color:#8B3A8B}.validity{margin-top:20px;padding:10px;background:#fff3cd;border-radius:4px}.footer{margin-top:40px;text-align:center;color:#666;font-size:12px}</style></head><body>
<div class="header"><div class="logo">Responde uAI</div><div>${quote.quote_number}</div></div>
<div><h2>Proposta para ${deal.lead?.company_name || "Cliente"}</h2><p><strong>Contato:</strong> ${deal.lead?.contact_name || "-"}</p><p><strong>Email:</strong> ${deal.lead?.email || "-"}</p><p><strong>Telefone:</strong> ${deal.lead?.phone || "-"}</p></div>
<h3>Produtos e Serviços</h3><table class="products-table"><thead><tr><th>Produto</th><th style="text-align:center;">Qtd</th><th style="text-align:right;">Preço Unit.</th><th style="text-align:right;">Total</th></tr></thead><tbody>${productsHTML}</tbody></table>
<div class="totals"><div class="total-row"><span>Subtotal:</span><span>${fmtCurrency(Number(deal.total_value) + Number(deal.discount_total))}</span></div>${Number(deal.discount_total) > 0 ? `<div class="total-row" style="color:#dc3545;"><span>Desconto:</span><span>- ${fmtCurrency(Number(deal.discount_total))}</span></div>` : ""}<hr style="border:none;border-top:1px solid #ddd;margin:10px 0;"/><div class="total-row"><span style="font-size:18px;font-weight:bold;">Total:</span><span class="total-final">${fmtCurrency(Number(deal.total_value))}</span></div>${Number(deal.recurring_value) > 0 ? `<div class="total-row" style="margin-top:10px;"><span>Setup:</span><span>${fmtCurrency(Number(deal.setup_value))}</span></div><div class="total-row"><span>Mensalidade:</span><span>${fmtCurrency(Number(deal.recurring_value))}/mês</span></div>` : ""}</div>
<div class="validity"><strong>⚠️ Validade:</strong> Esta proposta é válida até ${format(new Date(quote.valid_until), "dd/MM/yyyy", { locale: ptBR })}.</div>
<div class="footer"><p>Responde uAI - Automatize seu negócio</p><p>Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p></div></body></html>`;
}
