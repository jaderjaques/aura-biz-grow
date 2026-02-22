import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tag, Plus, X, Search } from 'lucide-react';
import { Tag as TagType } from '@/types/leads';

interface LeadTagSelectorProps {
  leadId: string;
  currentTags?: TagType[];
  onUpdate?: () => void;
  size?: 'sm' | 'md';
}

export function LeadTagSelector({ leadId, currentTags = [], onUpdate, size = 'md' }: LeadTagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<TagType[]>(currentTags);

  useEffect(() => {
    setSelectedTags(currentTags);
  }, [currentTags]);

  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen]);

  async function loadTags() {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setAllTags((data || []) as TagType[]);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    }
  }

  async function handleAddTag(tag: TagType) {
    if (selectedTags.find(t => t.id === tag.id)) {
      toast.error('Tag já adicionada');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('lead_tags')
        .insert([{ lead_id: leadId, tag_id: tag.id }]);

      if (error) throw error;

      setSelectedTags([...selectedTags, tag]);
      toast.success('Tag adicionada!');
      onUpdate?.();
    } catch (error) {
      console.error('Erro ao adicionar tag:', error);
      toast.error('Erro ao adicionar tag');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveTag(tagId: string) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('lead_tags')
        .delete()
        .eq('lead_id', leadId)
        .eq('tag_id', tagId);

      if (error) throw error;

      setSelectedTags(selectedTags.filter(t => t.id !== tagId));
      toast.success('Tag removida!');
      onUpdate?.();
    } catch (error) {
      console.error('Erro ao remover tag:', error);
      toast.error('Erro ao remover tag');
    } finally {
      setLoading(false);
    }
  }

  const filteredTags = allTags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedTags.find(t => t.id === tag.id)
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selectedTags.map(tag => (
        <Badge
          key={tag.id}
          style={{ backgroundColor: tag.color }}
          className="text-white flex items-center gap-1 pr-1"
        >
          {tag.name}
          <button
            onClick={() => handleRemoveTag(tag.id)}
            className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"
            disabled={loading}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-8 text-sm"
              />
            </div>
          </div>

          <ScrollArea className="max-h-48">
            <div className="p-1">
              {filteredTags.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Nenhuma tag encontrada
                </p>
              ) : (
                filteredTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag)}
                    disabled={loading}
                    className="w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </div>
                    {tag.description && (
                      <p className="text-xs text-muted-foreground ml-4 mt-0.5">
                        {tag.description}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
