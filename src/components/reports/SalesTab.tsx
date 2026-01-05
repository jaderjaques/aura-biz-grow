import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line 
} from "recharts";
import { useSalesFunnel } from "@/hooks/useReports";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export function SalesTab() {
  const { data: funnelData, isLoading } = useSalesFunnel();

  // Mock data for time in stage and win rate
  const stageTimeData = [
    { name: 'Proposta', dias: 5 },
    { name: 'Negociação', dias: 8 },
    { name: 'Fechamento', dias: 3 },
  ];

  const winRateData = [
    { month: 'Jul', taxa: 35 },
    { month: 'Ago', taxa: 42 },
    { month: 'Set', taxa: 38 },
    { month: 'Out', taxa: 45 },
    { month: 'Nov', taxa: 52 },
    { month: 'Dez', taxa: 48 },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando dados de vendas...</div>;
  }

  const maxCount = funnelData?.[0]?.count || 1;

  return (
    <div className="space-y-6">
      {/* Funil de Vendas */}
      <Card>
        <CardHeader>
          <CardTitle>Funil de Vendas</CardTitle>
          <CardDescription>Visualização do pipeline atual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {funnelData?.map((stage, index) => {
              const percentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
              return (
                <div key={stage.name} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{stage.name}</span>
                      <span className="text-sm text-muted-foreground">{stage.count} deals</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(stage.value)}</span>
                  </div>
                  <div className="relative h-10 bg-muted rounded-lg overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-primary/80 rounded-lg flex items-center justify-center transition-all"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    >
                      {stage.count > 0 && (
                        <span className="text-sm font-medium text-primary-foreground">
                          {percentage.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {(!funnelData || funnelData.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum deal no pipeline
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tempo Médio por Etapa */}
        <Card>
          <CardHeader>
            <CardTitle>Tempo Médio por Etapa</CardTitle>
            <CardDescription>Quantos dias os deals ficam em cada etapa</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stageTimeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`${value} dias`, 'Tempo']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="dias" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Win Rate por Mês */}
        <Card>
          <CardHeader>
            <CardTitle>Win Rate</CardTitle>
            <CardDescription>Taxa de fechamento ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={winRateData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Win Rate']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="taxa" 
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
