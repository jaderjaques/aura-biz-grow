import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Clock, Send, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTickets, useTicketMessages } from '@/hooks/useTickets';
import { cn } from '@/lib/utils';

interface TicketDetailsSheetProps {
  ticketId: string | null;
  onClose: () => void;
}

export function TicketDetailsSheet({ ticketId, onClose }: TicketDetailsSheetProps) {
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const { tickets, quickReplies, addMessage, updateTicket } = useTickets();
  const { data: messages = [], isLoading: messagesLoading } = useTicketMessages(ticketId);

  const ticket = tickets.find((t) => t.id === ticketId);

  const handleSendReply = async () => {
    if (!ticketId || !replyText.trim()) return;
    
    await addMessage({
      ticket_id: ticketId,
      message: replyText,
      is_internal: isInternal,
    });
    
    setReplyText('');
    setIsInternal(false);
  };

  const insertQuickReply = (content: string) => {
    setReplyText((prev) => prev + content);
  };

  const handleMarkResolved = async () => {
    if (!ticketId) return;
    await updateTicket({ id: ticketId, status: 'resolved', resolved_at: new Date().toISOString() });
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800',
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
      open: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      waiting_customer: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      open: 'Aberto',
      in_progress: 'Em Progresso',
      waiting_customer: 'Aguardando Cliente',
      resolved: 'Resolvido',
      closed: 'Fechado',
    };
    return <Badge className={styles[status] || styles.open}>{labels[status] || status}</Badge>;
  };

  return (
    <Sheet open={!!ticketId} onOpenChange={() => onClose()}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        {ticket && (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-left">{ticket.subject}</SheetTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{ticket.ticket_number}</Badge>
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{ticket.customer?.company_name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Categoria</p>
                  {ticket.category && (
                    <Badge style={{ backgroundColor: ticket.category.color + '20', color: ticket.category.color }}>
                      {ticket.category.name}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Criado</p>
                  <p>{format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Responsável</p>
                  <p>{ticket.assigned_user?.full_name || 'Não atribuído'}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-muted-foreground text-sm mb-1">Descrição</p>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
                  {ticket.description}
                </p>
              </div>

              {/* SLA Status */}
              {!ticket.first_response_at && ticket.sla_first_response_deadline && (
                <Alert variant={ticket.sla_first_response_violated ? 'destructive' : 'default'}>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    {ticket.sla_first_response_violated ? (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        SLA de primeira resposta violado!
                      </span>
                    ) : (
                      <span>
                        Primeira resposta até: {format(new Date(ticket.sla_first_response_deadline), 'HH:mm')}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Messages */}
              <div className="space-y-4">
                <h3 className="font-semibold">Conversação</h3>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "p-3 rounded-lg",
                        message.is_customer ? "bg-muted ml-12" : "bg-primary/10 mr-12"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {message.is_customer
                              ? ticket.customer?.contact_name?.[0] || 'C'
                              : message.created_by_user?.full_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {message.is_customer
                            ? ticket.customer?.contact_name
                            : message.created_by_user?.full_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(message.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      
                      {message.is_internal && (
                        <Badge className="mt-2 bg-yellow-100 text-yellow-800">
                          Nota Interna
                        </Badge>
                      )}
                    </div>
                  ))}
                  {messages.length === 0 && !messagesLoading && (
                    <p className="text-center text-muted-foreground text-sm py-4">
                      Nenhuma mensagem ainda
                    </p>
                  )}
                </div>
              </div>

              {/* Reply Form */}
              <div className="space-y-3">
                <Label htmlFor="reply">Responder</Label>
                <Textarea
                  id="reply"
                  rows={4}
                  placeholder="Digite sua mensagem..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="internal"
                    checked={isInternal}
                    onCheckedChange={(checked) => setIsInternal(!!checked)}
                  />
                  <Label htmlFor="internal" className="font-normal text-sm">
                    Nota interna (não visível para o cliente)
                  </Label>
                </div>
                
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Zap className="mr-2 h-4 w-4" />
                        Respostas Rápidas
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {quickReplies.map((qr) => (
                        <DropdownMenuItem
                          key={qr.id}
                          onClick={() => insertQuickReply(qr.content)}
                        >
                          {qr.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Button onClick={handleSendReply} className="flex-1" disabled={!replyText.trim()}>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar
                  </Button>
                </div>
              </div>

              {/* Actions */}
              {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleMarkResolved} className="flex-1">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Marcar como Resolvido
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
