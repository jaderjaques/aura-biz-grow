import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Star, Play, MoreVertical, Edit, Copy, Clock, Trash2, Plus 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSavedReports, useToggleFavoriteReport, useDeleteSavedReport } from "@/hooks/useReports";
import { REPORT_TYPE_LABELS, ReportType } from "@/types/reports";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SavedReportsTab() {
  const { data: savedReports, isLoading } = useSavedReports();
  const toggleFavorite = useToggleFavoriteReport();
  const deleteReport = useDeleteSavedReport();

  const handleRunReport = (reportId: string) => {
    toast.info("Gerando relatório...");
    // In production, this would trigger the report generation
  };

  const handleDuplicate = (reportId: string) => {
    toast.info("Duplicando relatório...");
  };

  const handleSchedule = (reportId: string) => {
    toast.info("Funcionalidade de agendamento em breve!");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando relatórios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Relatórios Salvos</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Criar Novo
        </Button>
      </div>

      <div className="grid gap-4">
        {savedReports?.map((report) => (
          <Card key={report.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{report.name}</h4>
                    {report.is_favorite && (
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    )}
                    <Badge variant="secondary">
                      {REPORT_TYPE_LABELS[report.report_type as ReportType] || report.report_type}
                    </Badge>
                    {report.scheduled && (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Agendado
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                  {report.last_generated_at && (
                    <p className="text-xs text-muted-foreground">
                      Última geração: {formatDistanceToNow(new Date(report.last_generated_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleFavorite.mutate({ 
                      id: report.id, 
                      isFavorite: !report.is_favorite 
                    })}
                  >
                    <Star className={cn(
                      "h-4 w-4",
                      report.is_favorite && "fill-amber-400 text-amber-400"
                    )} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRunReport(report.id)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(report.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSchedule(report.id)}>
                        <Clock className="h-4 w-4 mr-2" />
                        Agendar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => deleteReport.mutate(report.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deletar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!savedReports || savedReports.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum relatório salvo</p>
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Relatório
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
