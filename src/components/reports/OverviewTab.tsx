import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Users, Target, DollarSign, Receipt } from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, BarChart, Bar 
} from "recharts";
import { MetricCard } from "./MetricCard";
import { useOverviewMetrics, useRevenueData, usePipelineByStage, useLeadSourcePerformance } from "@/hooks/useReports";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export function OverviewTab() {
  const { data: metrics, isLoading: metricsLoading } = useOverviewMetrics();
  const { data: revenueData, isLoading: revenueLoading } = useRevenueData();
  const { data: pipelineData, isLoading: pipelineLoading } = usePipelineByStage();
  const { data: leadSourceData, isLoading: leadSourceLoading } = useLeadSourcePerformance();

  if (metricsLoading) {
    return <div className="flex items-center justify-center h-64">Carregando métricas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Leads"
          value={metrics?.totalLeads || 0}
          change={metrics?.leadsGrowth}
          icon={Users}
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${metrics?.conversionRate || 0}%`}
          change={metrics?.conversionGrowth}
          changeLabel=""
          icon={Target}
        />
        <MetricCard
          title="MRR"
          value={formatCurrency(metrics?.mrr || 0)}
          change={metrics?.mrrGrowth}
          icon={DollarSign}
        />
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(metrics?.avgDealValue || 0)}
          change={metrics?.ticketGrowth}
          icon={Receipt}
        />
      </div>

      {/* Gráficos principais */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Receita Mensal */}
        <Card>
          <CardHeader>
            <CardTitle>Receita Mensal</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(value) => `R$${value/1000}k`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="receita" 
                  name="Receita"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="mrr" 
                  name="MRR"
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-2))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline por Etapa */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline de Vendas</CardTitle>
            <CardDescription>Valor por etapa</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(value) => `R$${value/1000}k`} />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Origem de Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Origem</CardTitle>
          <CardDescription>Qual origem converte melhor?</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Total Leads</TableHead>
                <TableHead className="text-right">Qualificados</TableHead>
                <TableHead className="text-right">Convertidos</TableHead>
                <TableHead>Taxa Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadSourceData?.map((source) => (
                <TableRow key={source.source}>
                  <TableCell className="font-medium capitalize">{source.source}</TableCell>
                  <TableCell className="text-right">{source.totalLeads}</TableCell>
                  <TableCell className="text-right">{source.qualifiedLeads}</TableCell>
                  <TableCell className="text-right">{source.convertedLeads}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={source.conversionRate} className="w-20 h-2" />
                      <span className="text-sm">{source.conversionRate.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!leadSourceData || leadSourceData.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum dado disponível
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
