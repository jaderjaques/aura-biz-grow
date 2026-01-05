import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTeamPerformance } from "@/hooks/useReports";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export function TeamTab() {
  const { data: teamPerformance, isLoading } = useTeamPerformance();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando dados da equipe...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance da Equipe</CardTitle>
          <CardDescription>Métricas individuais</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membro</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Conversões</TableHead>
                <TableHead className="text-right">Deals</TableHead>
                <TableHead className="text-right">Fechados</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead>Taxa Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamPerformance?.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{member.totalLeads}</TableCell>
                  <TableCell className="text-right">{member.convertedLeads}</TableCell>
                  <TableCell className="text-right">{member.totalDeals}</TableCell>
                  <TableCell className="text-right">{member.wonDeals}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(member.revenue)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={member.conversionRate} className="w-20 h-2" />
                      <span className="text-sm">{member.conversionRate.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!teamPerformance || teamPerformance.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum membro da equipe com atividade
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
