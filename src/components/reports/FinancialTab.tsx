import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useFinancialMetrics, useMrrMovement, useLtvCacMetrics, useRevenueData } from "@/hooks/useReports";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export function FinancialTab() {
  const { data: financialMetrics, isLoading: financialLoading } = useFinancialMetrics();
  const { data: mrrMovement, isLoading: mrrLoading } = useMrrMovement();
  const { data: ltvCac, isLoading: ltvCacLoading } = useLtvCacMetrics();
  const { data: revenueData } = useRevenueData();

  if (financialLoading) {
    return <div className="flex items-center justify-center h-64">Carregando métricas financeiras...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Métricas Financeiras Principais */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">MRR</p>
            <p className="text-3xl font-bold mt-2">{formatCurrency(financialMetrics?.mrr || 0)}</p>
            <p className="text-sm text-muted-foreground mt-1">Receita Recorrente Mensal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">ARR</p>
            <p className="text-3xl font-bold mt-2">{formatCurrency(financialMetrics?.arr || 0)}</p>
            <p className="text-sm text-muted-foreground mt-1">Receita Recorrente Anual</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Churn Rate</p>
            <p className="text-3xl font-bold mt-2">{financialMetrics?.churnRate || 0}%</p>
            <p className="text-sm text-muted-foreground mt-1">Taxa de Cancelamento</p>
          </CardContent>
        </Card>
      </div>

      {/* MRR Movement */}
      <Card>
        <CardHeader>
          <CardTitle>Movimento de MRR</CardTitle>
          <CardDescription>Como o MRR está mudando</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <span className="text-muted-foreground">MRR Anterior</span>
              <span className="font-medium">{formatCurrency(mrrMovement?.previous || 0)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-emerald-500" />
                <span className="text-muted-foreground">+ Novo MRR</span>
              </div>
              <span className="font-medium text-emerald-500">+{formatCurrency(mrrMovement?.new || 0)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-emerald-500" />
                <span className="text-muted-foreground">+ Expansion MRR</span>
              </div>
              <span className="font-medium text-emerald-500">+{formatCurrency(mrrMovement?.expansion || 0)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-red-500" />
                <span className="text-muted-foreground">- Churn MRR</span>
              </div>
              <span className="font-medium text-red-500">-{formatCurrency(mrrMovement?.churn || 0)}</span>
            </div>
            <div className="flex items-center justify-between py-3 bg-muted/50 px-4 rounded-lg -mx-4">
              <span className="font-semibold">MRR Atual</span>
              <span className="font-bold text-lg">{formatCurrency(mrrMovement?.current || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* LTV & CAC */}
        <Card>
          <CardHeader>
            <CardTitle>LTV vs CAC</CardTitle>
            <CardDescription>Lifetime Value / Customer Acquisition Cost</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">LTV Médio</p>
                  <p className="text-2xl font-bold">{formatCurrency(ltvCac?.ltv || 0)}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">CAC Médio</p>
                  <p className="text-2xl font-bold">{formatCurrency(ltvCac?.cac || 0)}</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Ratio LTV:CAC</p>
                    <p className={cn(
                      "text-3xl font-bold",
                      (ltvCac?.ratio || 0) >= 3 ? "text-emerald-500" : "text-amber-500"
                    )}>
                      {(ltvCac?.ratio || 0).toFixed(1)}:1
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {(ltvCac?.ratio || 0) >= 3 ? "✓ Excelente!" : "⚠️ Pode melhorar"} (ideal: 3:1 ou maior)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Crescimento MRR */}
        <Card>
          <CardHeader>
            <CardTitle>Crescimento MRR</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `R$${value/1000}k`} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'MRR']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="mrr" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
