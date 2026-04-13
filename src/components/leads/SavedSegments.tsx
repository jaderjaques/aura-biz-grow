import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCurrentProfile } from '@/lib/tenant-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Bookmark, Plus, Star, MoreVertical, Edit,
  Trash2, Filter
} from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface FilterState {
  status?: string;
  source?: string;
  scoreGrade?: string;
  tagIds?: string[];
  tagOperator?: 'AND' | 'OR';
}

interface SavedSegmentsProps {
  currentFilters?: FilterState;
  onApplySegment?: (filters: FilterState) => void;
}

export function SavedSegments({ currentFilters = {}, onApplySegment }: SavedSegmentsProps) {
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_favorite: false,
    shared_with_team: false,
  });

  useEffect(() => {
    loadSegments();
  }, []);

  async function loadSegments() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_segments')
        .select('*')
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSegments(data || []);
    } catch (error) {
      console.error('Erro ao carregar segmentos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSegment(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const profile = await getCurrentProfile();
      const dataToSave = {
        ...formData,
        filters: currentFilters as unknown as Json,
        tenant_id: profile.tenant_id,
        created_by: profile.id,
      };

      if (editingSegment) {
        const { error } = await supabase
          .from('saved_segments')
          .update(dataToSave)
          .eq('id', editingSegment.id);

        if (error) throw error;
        toast.success('Segmento atualizado!');
      } else {
        const { error } = await supabase
          .from('saved_segments')
          .insert([dataToSave]);

        if (error) throw error;
        toast.success('Segmento salvo!');
      }

      setIsDialogOpen(false);
      setEditingSegment(null);
      resetForm();
      loadSegments();
    } catch (error) {
      console.error('Erro ao salvar segmento:', error);
      toast.error('Erro ao salvar segmento');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleFavorite(segmentId: string, currentValue: boolean) {
    try {
      const { error } = await supabase
        .from('saved_segments')
        .update({ is_favorite: !currentValue })
        .eq('id', segmentId);

      if (error) throw error;
      loadSegments();
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
    }
  }

  async function handleDelete(segmentId: string) {
    if (!confirm('Excluir este segmento?')) return;

    try {
      const { error } = await supabase
        .from('saved_segments')
        .delete()
        .eq('id', segmentId);

      if (error) throw error;
      toast.success('Segmento excluído!');
      loadSegments();
    } catch (error) {
      console.error('Erro ao excluir segmento:', error);
      toast.error('Erro ao excluir segmento');
    }
  }

  function openEditDialog(segment: any) {
    setEditingSegment(segment);
    setFormData({
      name: segment.name,
      description: segment.description || '',
      is_favorite: segment.is_favorite || false,
      shared_with_team: segment.shared_with_team || false,
    });
    setIsDialogOpen(true);
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      is_favorite: false,
      shared_with_team: false,
    });
  }

  function getFilterDescription(filters: any): string {
    if (!filters) return 'Sem filtros';
    const parts: string[] = [];
    if (filters.status && filters.status !== 'all') parts.push(`Status: ${filters.status}`);
    if (filters.source && filters.source !== 'all') parts.push(`Origem: ${filters.source}`);
    if (filters.scoreGrade && filters.scoreGrade !== 'all') parts.push(`Score: ${filters.scoreGrade}`);
    if (filters.tagIds && filters.tagIds.length > 0) parts.push(`${filters.tagIds.length} tag(s)`);
    return parts.join(' • ') || 'Sem filtros';
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Bookmark className="h-4 w-4 mr-2" />
            Segmentos
            {segments.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {segments.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Segmentos Salvos</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  resetForm();
                  setEditingSegment(null);
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {segments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Bookmark className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Nenhum segmento salvo
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {segments.map(segment => (
                    <div
                      key={segment.id}
                      className="p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleFavorite(segment.id, segment.is_favorite)}
                            className="hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`h-4 w-4 ${segment.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                            />
                          </button>
                          <span className="text-sm font-medium">{segment.name}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onApplySegment?.(segment.filters as FilterState)}>
                              <Filter className="mr-2 h-4 w-4" />
                              Aplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(segment)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(segment.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {segment.description && (
                        <p className="text-xs text-muted-foreground mt-1 ml-6">
                          {segment.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1 mt-1 ml-6">
                        <Badge variant="outline" className="text-[10px]">
                          {getFilterDescription(segment.filters)}
                        </Badge>
                        {segment.shared_with_team && (
                          <Badge variant="secondary" className="text-[10px]">
                            Compartilhado
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Save Segment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSegment ? 'Editar Segmento' : 'Salvar Segmento'}
            </DialogTitle>
            <DialogDescription>
              Salve esta combinação de filtros para reutilizar depois
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSegment} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Segmento *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Leads Quentes de Tecnologia"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva este segmento..."
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="favorite">Favorito</Label>
                  <p className="text-xs text-muted-foreground">
                    Aparece no topo da lista
                  </p>
                </div>
                <Switch
                  id="favorite"
                  checked={formData.is_favorite}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_favorite: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="shared">Compartilhar com equipe</Label>
                  <p className="text-xs text-muted-foreground">
                    Outros usuários podem ver
                  </p>
                </div>
                <Switch
                  id="shared"
                  checked={formData.shared_with_team}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, shared_with_team: checked })
                  }
                />
              </div>
            </div>

            <div className="p-3 bg-muted rounded">
              <p className="text-xs text-muted-foreground mb-1">Filtros Atuais:</p>
              <p className="text-sm">{getFilterDescription(currentFilters)}</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingSegment(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : editingSegment ? 'Atualizar' : 'Salvar Segmento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
