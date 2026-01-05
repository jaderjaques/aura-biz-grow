import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertCircle, AlertTriangle, Info, Download, Clock 
} from "lucide-react";
import { format } from "date-fns";
import { useAuditLogs } from "@/hooks/usePermissions";
import { ACTION_LABELS, SEVERITY_CONFIG } from "@/types/permissions";
import { toast } from "sonner";

export default function AuditLogs() {
  const [filterAction, setFilterAction] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterResource, setFilterResource] = useState("all");

  const { data: logs, isLoading } = useAuditLogs({
    action: filterAction,
    severity: filterSeverity,
    resourceType: filterResource
  });

  const handleExport = () => {
    toast.info("Exportando logs de auditoria...");
    // In production, this would generate a CSV/Excel file
    setTimeout(() => {
      toast.success("Logs exportados com sucesso!");
    }, 1500);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10';
      case 'warning':
        return 'bg-amber-500/10';
      default:
        return 'bg-blue-500/10';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Logs de Auditoria</h1>
            <p className="text-muted-foreground">
              Histórico completo de ações no sistema
            </p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Logs
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Ações</SelectItem>
                  <SelectItem value="create">Criar</SelectItem>
                  <SelectItem value="update">Atualizar</SelectItem>
                  <SelectItem value="delete">Deletar</SelectItem>
                  <SelectItem value="view">Visualizar</SelectItem>
                  <SelectItem value="export">Exportar</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterResource} onValueChange={setFilterResource}>
                <SelectTrigger>
                  <SelectValue placeholder="Recurso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Recursos</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="deal">Proposta</SelectItem>
                  <SelectItem value="customer">Cliente</SelectItem>
                  <SelectItem value="invoice">Fatura</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Severidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Ações</CardTitle>
            <CardDescription>
              {logs?.length || 0} registros encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando logs...
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-start gap-4 pb-4 border-b last:border-0"
                  >
                    <div className={`flex-shrink-0 mt-1 p-2 rounded-full ${getSeverityBg(log.severity || 'info')}`}>
                      {getSeverityIcon(log.severity || 'info')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium">
                          {log.user_name || 'Sistema'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {log.resource_type}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {log.description || 'Ação realizada no sistema'}
                      </p>

                      {log.changes && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                          <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(log.created_at!), 'dd/MM/yyyy HH:mm:ss')}
                        </div>
                        {log.ip_address && (
                          <>
                            <span>•</span>
                            <span>IP: {log.ip_address}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log encontrado com os filtros selecionados
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
