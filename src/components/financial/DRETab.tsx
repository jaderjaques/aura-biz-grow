import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  DollarSign,
  Percent,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DREData {
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custosVariaveis: number;
  lucroBruto: number;
  margemBruta: number;
  despesasMarketing: number;
  despesasInfraestrutura: number;
  despesasSalarios: number;
  despesasOutras: number;
  totalDespesas: number;
  lucroOperacional: number;
  margemOperacional: number;
  impostosETaxas: number;
  lucroLiquido: number;
  margemLiquida: number;
  ebitda: number;
  margemEbitda: number;
}

interface EvolutionPoint {
  month: string;
  receita: number;
  despesas: number;
  lucro: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

const initialDRE: DREData = {
  receitaBruta: 0,
  deducoes: 0,
  receitaLiquida: 0,
  custosVariaveis: 0,
  lucroBruto: 0,
  margemBruta: 0,
  despesasMarketing: 0,
  despesasInfraestrutura: 0,
  despesasSalarios: 0,
  despesasOutras: 0,
  totalDespesas: 0,
  lucroOperacional: 0,
  margemOperacional: 0,
  impostosETaxas: 0,
  lucroLiquido: 0,
  margemLiquida: 0,
  ebitda: 0,
  margemEbitda: 0,
};

export function DRETab() {
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [dre, setDre] = useState<DREData>(initialDRE);
  const [evolutionChart, setEvolutionChart] = useState<EvolutionPoint[]>([]);

  const loadDRE = useCallback(async () => {
    setLoading(true);
    try {
      const currentMonth = new Date(selectedMonth + "-01");
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const startStr = format(monthStart, "yyyy-MM-dd");
      const endStr = format(monthEnd, "yyyy-MM-dd");

      // Fetch revenues and expenses in parallel
      const [{ data: revenues }, { data: expenses }] = await Promise.all([
        supabase
          .from("cash_transactions")
          .select("amount, expense_category:revenue_categories(name)")
          .eq("type", "revenue")
          .gte("transaction_date", startStr)
          .lte("transaction_date", endStr),
        supabase
          .from("cash_transactions")
          .select("amount, expense_category:expense_categories(name)")
          .eq("type", "expense")
          .gte("transaction_date", startStr)
          .lte("transaction_date", endStr),
      ]);

      const receitaBruta = revenues?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const deducoes = 0;
      const receitaLiquida = receitaBruta - deducoes;

      let despesasMarketing = 0;
      let despesasInfraestrutura = 0;
      let despesasSalarios = 0;
      let impostosETaxas = 0;
      let despesasOutras = 0;

      expenses?.forEach((exp) => {
        const amount = Number(exp.amount);
        const category = ((exp.expense_category as any)?.name || "").toLowerCase();

        if (category.includes("marketing")) {
          despesasMarketing += amount;
        } else if (category.includes("infraestrutura") || category.includes("escritório")) {
          despesasInfraestrutura += amount;
        } else if (category.includes("salário") || category.includes("salarios")) {
          despesasSalarios += amount;
        } else if (category.includes("imposto") || category.includes("taxa")) {
          impostosETaxas += amount;
        } else {
          despesasOutras += amount;
        }
      });

      const custosVariaveis = 0;
      const lucroBruto = receitaLiquida - custosVariaveis;
      const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
      const totalDespesas = despesasMarketing + despesasInfraestrutura + despesasSalarios + despesasOutras;
      const lucroOperacional = lucroBruto - totalDespesas;
      const margemOperacional = receitaLiquida > 0 ? (lucroOperacional / receitaLiquida) * 100 : 0;
      const lucroLiquido = lucroOperacional - impostosETaxas;
      const margemLiquida = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;
      const ebitda = lucroOperacional;
      const margemEbitda = receitaLiquida > 0 ? (ebitda / receitaLiquida) * 100 : 0;

      setDre({
        receitaBruta,
        deducoes,
        receitaLiquida,
        custosVariaveis,
        lucroBruto,
        margemBruta,
        despesasMarketing,
        despesasInfraestrutura,
        despesasSalarios,
        despesasOutras,
        totalDespesas,
        lucroOperacional,
        margemOperacional,
        impostosETaxas,
        lucroLiquido,
        margemLiquida,
        ebitda,
        margemEbitda,
      });

      // Load 6-month evolution
      const months: EvolutionPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(currentMonth, i);
        const s = format(startOfMonth(date), "yyyy-MM-dd");
        const e = format(endOfMonth(date), "yyyy-MM-dd");

        const [{ data: rev }, { data: exp }] = await Promise.all([
          supabase.from("cash_transactions").select("amount").eq("type", "revenue").gte("transaction_date", s).lte("transaction_date", e),
          supabase.from("cash_transactions").select("amount").eq("type", "expense").gte("transaction_date", s).lte("transaction_date", e),
        ]);

        const receita = rev?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const despesas = exp?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        months.push({
          month: format(date, "MMM/yy", { locale: ptBR }),
          receita,
          despesas,
          lucro: receita - despesas,
        });
      }
      setEvolutionChart(months);
    } catch (error) {
      console.error("Erro ao carregar DRE:", error);
      toast.error("Erro ao carregar DRE");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadDRE();
  }, [loadDRE]);

  function exportDREToPDF() {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(139, 58, 139);
    doc.text("Responde uAI CRM", 14, 20);

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("DRE - Demonstrativo de Resultado", 14, 30);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const period = format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: ptBR });
    doc.text(`Período: ${period}`, 14, 37);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 42);

    const tableData = [
      ["RECEITA BRUTA", formatCurrency(dre.receitaBruta), ""],
      ["(-) Deduções", formatCurrency(dre.deducoes), ""],
      ["RECEITA LÍQUIDA", formatCurrency(dre.receitaLiquida), "100%"],
      ["", "", ""],
      ["(-) Custos Variáveis", formatCurrency(dre.custosVariaveis), ""],
      ["LUCRO BRUTO", formatCurrency(dre.lucroBruto), `${dre.margemBruta.toFixed(1)}%`],
      ["", "", ""],
      ["DESPESAS OPERACIONAIS", "", ""],
      ["  Marketing", formatCurrency(dre.despesasMarketing), ""],
      ["  Infraestrutura", formatCurrency(dre.despesasInfraestrutura), ""],
      ["  Salários", formatCurrency(dre.despesasSalarios), ""],
      ["  Outras", formatCurrency(dre.despesasOutras), ""],
      ["Total Despesas", formatCurrency(dre.totalDespesas), ""],
      ["", "", ""],
      ["LUCRO OPERACIONAL (EBITDA)", formatCurrency(dre.ebitda), `${dre.margemEbitda.toFixed(1)}%`],
      ["", "", ""],
      ["(-) Impostos e Taxas", formatCurrency(dre.impostosETaxas), ""],
      ["LUCRO LÍQUIDO", formatCurrency(dre.lucroLiquido), `${dre.margemLiquida.toFixed(1)}%`],
    ];

    autoTable(doc, {
      startY: 52,
      head: [["Descrição", "Valor (R$)", "% Receita"]],
      body: tableData,
      headStyles: { fillColor: [139, 58, 139] },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: "right" },
        2: { cellWidth: 30, halign: "right" },
      },
      didParseCell: function (data) {
        const boldRows = [
          "RECEITA BRUTA",
          "RECEITA LÍQUIDA",
          "LUCRO BRUTO",
          "DESPESAS OPERACIONAIS",
          "LUCRO OPERACIONAL (EBITDA)",
          "LUCRO LÍQUIDO",
        ];
        if (data.section === "body" && boldRows.includes(String(data.cell.raw))) {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: "center" });
    }

    doc.save(`dre-${selectedMonth}.pdf`);
    toast.success("DRE exportado em PDF!");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const getMarginLabel = (value: number, thresholds: [number, number, number]) => {
    if (value >= thresholds[0]) return "✓ Excelente";
    if (value >= thresholds[1]) return "✓ Boa";
    if (value >= thresholds[2]) return "⚠️ Regular";
    return "❌ Negativa";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">DRE - Demonstrativo de Resultado</h2>
          <p className="text-muted-foreground">Análise completa do resultado financeiro</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = subMonths(new Date(), i);
                const value = format(date, "yyyy-MM");
                return (
                  <SelectItem key={value} value={value}>
                    {format(date, "MMMM yyyy", { locale: ptBR })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadDRE}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={exportDREToPDF}>
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Receita Líquida</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(dre.receitaLiquida)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Lucro Bruto</p>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(dre.lucroBruto)}</p>
            <p className="text-xs text-muted-foreground mt-1">Margem: {dre.margemBruta.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">EBITDA</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(dre.ebitda)}</p>
            <p className="text-xs text-muted-foreground mt-1">Margem: {dre.margemEbitda.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Lucro Líquido</p>
              {dre.lucroLiquido >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            <p className={`text-2xl font-bold ${dre.lucroLiquido >= 0 ? "text-success" : "text-destructive"}`}>
              {formatCurrency(dre.lucroLiquido)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Margem: {dre.margemLiquida.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* DRE Detalhado + Indicadores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Demonstrativo Detalhado</CardTitle>
            <CardDescription>Estrutura completa do DRE</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Receitas */}
            <div className="flex justify-between font-semibold">
              <span>RECEITA BRUTA</span>
              <span>{formatCurrency(dre.receitaBruta)}</span>
            </div>
            {dre.deducoes > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground pl-4">
                <span>(-) Deduções</span>
                <span>{formatCurrency(dre.deducoes)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-primary">
              <span>RECEITA LÍQUIDA</span>
              <span>{formatCurrency(dre.receitaLiquida)}</span>
            </div>
            <Separator />

            {/* Custos */}
            {dre.custosVariaveis > 0 && (
              <>
                <div className="flex justify-between text-sm text-muted-foreground pl-4">
                  <span>(-) Custos Variáveis</span>
                  <span>{formatCurrency(dre.custosVariaveis)}</span>
                </div>
                <Separator />
              </>
            )}

            <div className="flex justify-between font-semibold">
              <span>LUCRO BRUTO</span>
              <div className="flex items-center gap-2">
                <span>{formatCurrency(dre.lucroBruto)}</span>
                <Badge variant="outline">{dre.margemBruta.toFixed(1)}%</Badge>
              </div>
            </div>
            <Separator />

            {/* Despesas */}
            <p className="font-semibold text-sm">DESPESAS OPERACIONAIS</p>
            <div className="flex justify-between text-sm pl-4">
              <span>Marketing</span>
              <span>{formatCurrency(dre.despesasMarketing)}</span>
            </div>
            <div className="flex justify-between text-sm pl-4">
              <span>Infraestrutura</span>
              <span>{formatCurrency(dre.despesasInfraestrutura)}</span>
            </div>
            <div className="flex justify-between text-sm pl-4">
              <span>Salários</span>
              <span>{formatCurrency(dre.despesasSalarios)}</span>
            </div>
            {dre.despesasOutras > 0 && (
              <div className="flex justify-between text-sm pl-4">
                <span>Outras</span>
                <span>{formatCurrency(dre.despesasOutras)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-medium pl-4">
              <span>Total Despesas</span>
              <span>{formatCurrency(dre.totalDespesas)}</span>
            </div>
            <Separator />

            {/* EBITDA */}
            <div className="flex justify-between font-semibold">
              <span>EBITDA</span>
              <div className="flex items-center gap-2">
                <span>{formatCurrency(dre.ebitda)}</span>
                <Badge variant="outline">{dre.margemEbitda.toFixed(1)}%</Badge>
              </div>
            </div>
            <Separator />

            {/* Resultado Final */}
            {dre.impostosETaxas > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground pl-4">
                <span>(-) Impostos e Taxas</span>
                <span>{formatCurrency(dre.impostosETaxas)}</span>
              </div>
            )}

            <div className={`flex justify-between font-bold text-lg ${dre.lucroLiquido >= 0 ? "text-success" : "text-destructive"}`}>
              <span>LUCRO LÍQUIDO</span>
              <div className="flex items-center gap-2">
                <span>{formatCurrency(dre.lucroLiquido)}</span>
                <Badge variant="outline" className={dre.lucroLiquido >= 0 ? "border-success" : "border-destructive"}>
                  {dre.margemLiquida.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Indicadores */}
        <Card>
          <CardHeader>
            <CardTitle>Análise de Indicadores</CardTitle>
            <CardDescription>Margens e índices importantes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Margem Bruta */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Margem Bruta</span>
                <span>{dre.margemBruta.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(dre.margemBruta, 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{getMarginLabel(dre.margemBruta, [70, 50, 0])}</p>
            </div>

            <Separator />

            {/* Margem EBITDA */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Margem EBITDA</span>
                <span>{dre.margemEbitda.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(Math.max(dre.margemEbitda, 0), 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{getMarginLabel(dre.margemEbitda, [30, 15, 0])}</p>
            </div>

            <Separator />

            {/* Margem Líquida */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Margem Líquida</span>
                <span className={dre.margemLiquida >= 0 ? "text-success" : "text-destructive"}>
                  {dre.margemLiquida.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${dre.margemLiquida >= 0 ? "bg-success" : "bg-destructive"}`}
                  style={{ width: `${Math.min(Math.abs(dre.margemLiquida), 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {dre.margemLiquida >= 20
                  ? "✓ Excelente"
                  : dre.margemLiquida >= 10
                    ? "✓ Boa"
                    : dre.margemLiquida >= 0
                      ? "⚠️ Regular"
                      : "❌ Prejuízo"}
              </p>
            </div>

            <Separator />

            {/* Composição de Despesas */}
            {dre.totalDespesas > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-sm">Composição de Despesas</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Marketing</span>
                    <span>{((dre.despesasMarketing / dre.totalDespesas) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Infraestrutura</span>
                    <span>{((dre.despesasInfraestrutura / dre.totalDespesas) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Salários</span>
                    <span>{((dre.despesasSalarios / dre.totalDespesas) * 100).toFixed(1)}%</span>
                  </div>
                  {dre.despesasOutras > 0 && (
                    <div className="flex justify-between">
                      <span>Outras</span>
                      <span>{((dre.despesasOutras / dre.totalDespesas) * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evolução */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Resultado</CardTitle>
          <CardDescription>Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={evolutionChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => formatCurrency(Number(v))} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
              <Bar dataKey="receita" name="Receita" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="lucro" name="Lucro" stroke="hsl(var(--primary))" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
