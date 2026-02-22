import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X, Tag, UserPlus, Trash2, CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Lead, Tag as TagType } from '@/types/leads';

interface BulkActionsBarProps {
  selectedLeads: Lead[];
  onClearSelection: () => void;
  onComplete: () => void;
  allTags?: TagType[];
  allUsers?: { id: string; full_name: string }[];
}

export function BulkActionsBar({
  selectedLeads,
  onClearSelection,
  onComplete,
  allTags = [],
  allUsers = [],
}: BulkActionsBarProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState('');

  if (selectedLeads.length === 0) return null;

  async function handleBulkAction() {
    if (!action) {
      toast.error('Selecione uma ação');
      return;
    }

    if (['add_tag', 'remove_tag', 'assign', 'change_status'].includes(action) && !selectedValue) {
      toast.error('Selecione um valor');
      return;
    }

    if (action === 'delete') {
      setIsDialogOpen(true);
      return;
    }

    setLoading(true);
    try {
      const leadIds = selectedLeads.map(l => l.id);

      if (action === 'add_tag') {
        for (const leadId of leadIds) {
          await supabase
            .from('lead_tags')
            .upsert({ lead_id: leadId, tag_id: selectedValue }, { onConflict: 'lead_id,tag_id' });
        }
        toast.success(`Tag adicionada a ${leadIds.length} lead(s)!`);
      } else if (action === 'remove_tag') {
        const { error } = await supabase
          .from('lead_tags')
          .delete()
          .in('lead_id', leadIds)
          .eq('tag_id', selectedValue);

        if (error) throw error;
        toast.success(`Tag removida de ${leadIds.length} lead(s)!`);
      } else if (action === 'assign') {
        const { error } = await supabase
          .from('leads')
          .update({ assigned_to: selectedValue })
          .in('id', leadIds);

        if (error) throw error;
        toast.success(`${leadIds.length} lead(s) atribuído(s)!`);
      } else if (action === 'change_status') {
        const { error } = await supabase
          .from('leads')
          .update({ status: selectedValue })
          .in('id', leadIds);

        if (error) throw error;
        toast.success(`Status de ${leadIds.length} lead(s) atualizado!`);
      }

      onComplete();
      onClearSelection();
      setAction('');
      setSelectedValue('');
    } catch (error) {
      console.error('Erro na ação em massa:', error);
      toast.error('Erro ao executar ação');
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkDelete() {
    setLoading(true);
    try {
      const leadIds = selectedLeads.map(l => l.id);

      // Soft delete
      const { error } = await supabase
        .from('leads')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', leadIds);

      if (error) throw error;

      toast.success(`${leadIds.length} lead(s) excluído(s)!`);
      onComplete();
      onClearSelection();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao excluir leads:', error);
      toast.error('Erro ao excluir leads');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
        <Card className="shadow-xl border-2 border-primary/20">
          <div className="flex items-center gap-3 p-4">
            {/* Counter */}
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-sm">
                {selectedLeads.length} selecionado(s)
              </Badge>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClearSelection}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Action select */}
            <Select value={action} onValueChange={(v) => { setAction(v); setSelectedValue(''); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecionar ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add_tag">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Adicionar Tag
                  </div>
                </SelectItem>
                <SelectItem value="remove_tag">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Remover Tag
                  </div>
                </SelectItem>
                <SelectItem value="assign">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Atribuir para
                  </div>
                </SelectItem>
                <SelectItem value="change_status">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Mudar Status
                  </div>
                </SelectItem>
                <SelectItem value="delete">
                  <div className="flex items-center gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Value select (conditional) */}
            {(action === 'add_tag' || action === 'remove_tag') && (
              <Select value={selectedValue} onValueChange={setSelectedValue}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecionar tag" />
                </SelectTrigger>
                <SelectContent>
                  {allTags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {action === 'assign' && (
              <Select value={selectedValue} onValueChange={setSelectedValue}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecionar usuário" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {action === 'change_status' && (
              <Select value={selectedValue} onValueChange={setSelectedValue}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecionar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="qualificado">Qualificado</SelectItem>
                  <SelectItem value="descartado">Descartado</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Execute button */}
            <Button onClick={handleBulkAction} disabled={loading || !action}>
              {loading ? 'Processando...' : 'Executar'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir {selectedLeads.length} lead(s)?
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Os leads serão permanentemente excluídos do sistema.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-40">
            <div className="space-y-1">
              {selectedLeads.slice(0, 10).map(lead => (
                <p key={lead.id} className="text-sm text-muted-foreground">
                  {lead.company_name} - {lead.contact_name}
                </p>
              ))}
              {selectedLeads.length > 10 && (
                <p className="text-sm text-muted-foreground font-medium">
                  ... e mais {selectedLeads.length - 10}
                </p>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={loading}>
              {loading ? 'Excluindo...' : `Excluir ${selectedLeads.length} lead(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
