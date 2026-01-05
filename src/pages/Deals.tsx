import { useState } from "react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { FileText, DollarSign, CheckCircle, TrendingUp, Plus } from "lucide-react";
import { useDeals } from "@/hooks/useDeals";
import { DealsTable } from "@/components/deals/DealsTable";
import { NewDealDialog } from "@/components/deals/NewDealDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DealWithDetails, SelectedProduct } from "@/types/products";

export default function Deals() {
  const {
    deals,
    loading,
    createDeal,
    markAsWon,
    markAsLost,
    getOpenDeals,
    getTotalValue,
    getWonThisMonth,
    getConversionRate,
  } = useDeals();
  const { toast } = useToast();
  const [filterStage, setFilterStage] = useState("all");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealWithDetails | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const filteredDeals =
    filterStage === "all" ? deals : deals.filter((d) => d.stage === filterStage);

  const handleCreateDeal = async (dealData: any, products: SelectedProduct[]) => {
    await createDeal(dealData, products);
  };

  const handleView = (deal: DealWithDetails) => {
    setSelectedDeal(deal);
    // TODO: Open deal details sidebar
  };

  const handleGenerateQuote = async (dealId: string) => {
    try {
      const deal = deals.find((d) => d.id === dealId);
      if (!deal) return;

      const { data: user } = await supabase.auth.getUser();

      // Create quote record
      const { data: quote, error } = await supabase
        .from("quotes")
        .insert({
          deal_id: dealId,
          title: `Proposta Comercial - ${deal.lead?.company_name || "Cliente"}`,
          total_value: deal.total_value,
          status: "draft",
          valid_until: addDays(new Date(), 15).toISOString().split("T")[0],
          created_by: user.user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Generate HTML quote (MVP - future: PDF)
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
      toast({
        title: "Erro ao gerar proposta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateQuoteHTML = (deal: DealWithDetails, quote: any) => {
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);

    const productsHTML = deal.deal_products
      ?.map(
        (dp) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${dp.product?.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${dp.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(Number(dp.unit_price))}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(Number(dp.total))}</td>
        </tr>
      `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${quote.quote_number} - ${deal.lead?.company_name}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 24px; font-weight: bold; color: #8B3A8B; }
          .quote-number { color: #666; margin-top: 8px; }
          .client-info { margin-bottom: 30px; }
          .products-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .products-table th { background: #f5f5f5; padding: 12px; text-align: left; }
          .totals { background: linear-gradient(135deg, #8B3A8B10, #FF6B3510); padding: 20px; border-radius: 8px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .total-final { font-size: 24px; font-weight: bold; color: #8B3A8B; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
          .validity { margin-top: 20px; padding: 10px; background: #fff3cd; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Responde uAI</div>
          <div class="quote-number">${quote.quote_number}</div>
        </div>
        
        <div class="client-info">
          <h2>Proposta para ${deal.lead?.company_name || "Cliente"}</h2>
          <p><strong>Contato:</strong> ${deal.lead?.contact_name || "-"}</p>
          <p><strong>Email:</strong> ${deal.lead?.email || "-"}</p>
          <p><strong>Telefone:</strong> ${deal.lead?.phone || "-"}</p>
        </div>

        <h3>Produtos e Serviços</h3>
        <table class="products-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th style="text-align: center;">Qtd</th>
              <th style="text-align: right;">Preço Unit.</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${productsHTML}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(Number(deal.total_value) + Number(deal.discount_total))}</span>
          </div>
          ${
            Number(deal.discount_total) > 0
              ? `<div class="total-row" style="color: #dc3545;">
                  <span>Desconto:</span>
                  <span>- ${formatCurrency(Number(deal.discount_total))}</span>
                </div>`
              : ""
          }
          <hr style="border: none; border-top: 1px solid #ddd; margin: 10px 0;" />
          <div class="total-row">
            <span style="font-size: 18px; font-weight: bold;">Total:</span>
            <span class="total-final">${formatCurrency(Number(deal.total_value))}</span>
          </div>
          ${
            Number(deal.recurring_value) > 0
              ? `<div class="total-row" style="margin-top: 10px;">
                  <span>Setup:</span>
                  <span>${formatCurrency(Number(deal.setup_value))}</span>
                </div>
                <div class="total-row">
                  <span>Mensalidade:</span>
                  <span>${formatCurrency(Number(deal.recurring_value))}/mês</span>
                </div>`
              : ""
          }
        </div>

        <div class="validity">
          <strong>⚠️ Validade:</strong> Esta proposta é válida até ${format(new Date(quote.valid_until), "dd/MM/yyyy", { locale: ptBR })}.
        </div>

        <div class="footer">
          <p>Responde uAI - Automatize seu negócio</p>
          <p>Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Stats rápidos */}
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

        {/* Tabela de deals */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Propostas</CardTitle>
              <div className="flex gap-2">
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
            ) : (
              <DealsTable
                deals={filteredDeals}
                onView={handleView}
                onGenerateQuote={handleGenerateQuote}
                onMarkAsWon={markAsWon}
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
    </AppLayout>
  );
}
