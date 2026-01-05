import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreVertical, Eye, UserPlus, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import type { Ticket } from '@/types/tickets';
import { TicketDetailsSheet } from './TicketDetailsSheet';
import { useTickets } from '@/hooks/useTickets';
import { useAuth } from '@/contexts/AuthContext';

interface TicketsTableProps {
  tickets: Ticket[];
}

export function TicketsTable({ tickets }: TicketsTableProps) {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { updateTicket } = useTickets();
  const { user } = useAuth();

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    const labels: Record<string, string> = {
      urgent: 'Urgente',
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa',
    };
    return <Badge className={styles[priority] || styles.medium}>{labels[priority] || priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      waiting_customer: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels: Record<string, string> = {
      open: 'Aberto',
      in_progress: 'Em Progresso',
      waiting_customer: 'Aguardando Cliente',
      resolved: 'Resolvido',
      closed: 'Fechado',
      cancelled: 'Cancelado',
    };
    return <Badge className={styles[status] || styles.open}>{labels[status] || status}</Badge>;
  };

  const handleAssignToMe = async (ticketId: string) => {
    await updateTicket({ id: ticketId, assigned_to: user?.id, status: 'in_progress' });
  };

  const handleMarkResolved = async (ticketId: string) => {
    await updateTicket({ id: ticketId, status: 'resolved', resolved_at: new Date().toISOString() });
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead className="w-[50px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <TableCell className="font-mono text-sm">
                    {ticket.ticket_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{ticket.customer?.company_name || '-'}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.customer?.contact_name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[200px] truncate">{ticket.subject}</p>
                  </TableCell>
                  <TableCell>
                    {ticket.category && (
                      <Badge 
                        variant="outline"
                        style={{ borderColor: ticket.category.color, color: ticket.category.color }}
                      >
                        {ticket.category.name}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell>
                    {ticket.assigned_user ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {ticket.assigned_user.full_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{ticket.assigned_user.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Não atribuído</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {ticket.sla_first_response_violated || ticket.sla_resolution_violated ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Violado
                      </Badge>
                    ) : ticket.first_response_at ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        OK
                      </Badge>
                    ) : ticket.sla_first_response_deadline ? (
                      <span className="text-xs flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(ticket.sla_first_response_deadline), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedTicketId(ticket.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAssignToMe(ticket.id)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Atribuir a Mim
                        </DropdownMenuItem>
                        {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                          <DropdownMenuItem onClick={() => handleMarkResolved(ticket.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Marcar como Resolvido
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {tickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum ticket encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TicketDetailsSheet
        ticketId={selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
      />
    </>
  );
}
