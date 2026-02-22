import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { LeadSourceBadge } from "./LeadSourceBadge";
import { LeadScoreBadge } from "./LeadScoreBadge";
import { Lead } from "@/types/leads";
import { MoreVertical, Edit, UserPlus, Calendar, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadsTableProps {
  leads: Lead[];
  selectedLeads: string[];
  onSelectLead: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onOpenLead: (id: string) => void;
  onEditLead: (id: string) => void;
  onAssignLead: (id: string) => void;
  onAddActivity: (id: string) => void;
  onDeleteLead: (id: string) => void;
}

export function LeadsTable({
  leads,
  selectedLeads,
  onSelectLead,
  onSelectAll,
  onOpenLead,
  onEditLead,
  onAssignLead,
  onAddActivity,
  onDeleteLead,
}: LeadsTableProps) {
  const allSelected = leads.length > 0 && selectedLeads.length === leads.length;

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
              />
            </TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Criado</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow
              key={lead.id}
              className={cn(
                "cursor-pointer hover:bg-muted/50",
                !lead.viewed_at && "bg-primary/5"
              )}
              onClick={() => onOpenLead(lead.id)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedLeads.includes(lead.id)}
                  onCheckedChange={(checked) => onSelectLead(lead.id, !!checked)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {!lead.viewed_at && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                      Novo
                    </Badge>
                  )}
                  <div>
                    <p className="font-medium">{lead.company_name}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-sm">{lead.contact_name || "-"}</p>
                  <p className="text-xs text-muted-foreground">{lead.position || "-"}</p>
                </div>
              </TableCell>
              <TableCell>
                <LeadSourceBadge source={lead.source} />
              </TableCell>
              <TableCell>
                <LeadStatusBadge status={lead.status} />
              </TableCell>
              <TableCell>
                <LeadScoreBadge score={lead.lead_score} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {lead.tags?.slice(0, 2).map((tag) => (
                    <Badge
                      key={tag.id}
                      style={{ backgroundColor: tag.color }}
                      className="text-white text-[10px] px-1.5 py-0"
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  {(lead.tags?.length || 0) > 2 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      +{(lead.tags?.length || 0) - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {lead.assigned_user ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={lead.assigned_user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {lead.assigned_user.full_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{lead.assigned_user.full_name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Não atribuído</span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(lead.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditLead(lead.id)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAssignLead(lead.id)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Atribuir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddActivity(lead.id)}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Adicionar Atividade
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteLead(lead.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                Nenhum lead encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
