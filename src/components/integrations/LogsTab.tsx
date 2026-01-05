import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, Filter, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIntegrationLogs } from "@/hooks/useIntegrations";
import { IntegrationLog } from "@/types/integrations";

export function LogsTab() {
  const [filterType, setFilterType] = useState("all");
  const [selectedLog, setSelectedLog] = useState<IntegrationLog | null>(null);
  const { data: logs = [], isLoading } = useIntegrationLogs(filterType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Logs de Integração</h3>
          <p className="text-sm text-muted-foreground">
            Visualize o histórico de integrações
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="n8n">n8n</SelectItem>
              <SelectItem value="evolution_api">Evolution API</SelectItem>
              <SelectItem value="email_smtp">Email SMTP</SelectItem>
              <SelectItem value="api_rest">API REST</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum log encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {log.created_at && format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.integration_type}</Badge>
                    </TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>
                      {log.success ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Sucesso
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" />
                          Erro
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                    <p>{selectedLog.integration_type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ação</p>
                    <p>{selectedLog.action}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p>{selectedLog.success ? "Sucesso" : "Erro"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data</p>
                    <p>
                      {selectedLog.created_at &&
                        format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {selectedLog.error_message && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Mensagem de Erro</p>
                    <pre className="bg-destructive/10 text-destructive p-3 rounded text-sm overflow-auto">
                      {selectedLog.error_message}
                    </pre>
                  </div>
                )}

                {selectedLog.request_data && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Request</p>
                    <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                      {JSON.stringify(selectedLog.request_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.response_data && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Response</p>
                    <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                      {JSON.stringify(selectedLog.response_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
