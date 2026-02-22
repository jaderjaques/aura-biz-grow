import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Filter, X } from 'lucide-react';
import { Tag as TagType } from '@/types/leads';

interface AdvancedTagFilterProps {
  onFilterChange: (tagIds: string[], operator: 'AND' | 'OR') => void;
  selectedTags?: string[];
  operator?: 'AND' | 'OR';
}

export function AdvancedTagFilter({
  onFilterChange,
  selectedTags = [],
  operator = 'OR',
}: AdvancedTagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [localSelectedTags, setLocalSelectedTags] = useState<string[]>(selectedTags);
  const [localOperator, setLocalOperator] = useState<'AND' | 'OR'>(operator);

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setAllTags((data || []) as TagType[]);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    }
  }

  function handleToggleTag(tagId: string) {
    setLocalSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  }

  function handleApply() {
    onFilterChange(localSelectedTags, localOperator);
    setIsOpen(false);
  }

  function handleClear() {
    setLocalSelectedTags([]);
    setLocalOperator('OR');
    onFilterChange([], 'OR');
  }

  const hasFilters = localSelectedTags.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Tags
          {hasFilters && (
            <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {localSelectedTags.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Filtrar por Tags</p>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleClear}>
                Limpar
              </Button>
            )}
          </div>

          {localSelectedTags.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Condição</p>
              <RadioGroup value={localOperator} onValueChange={(v) => setLocalOperator(v as 'AND' | 'OR')}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="OR" id="or" />
                    <Label htmlFor="or" className="text-xs">OU (qualquer)</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="AND" id="and" />
                    <Label htmlFor="and" className="text-xs">E (todas)</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {localSelectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allTags
                .filter(t => localSelectedTags.includes(t.id))
                .map(tag => (
                  <Badge
                    key={tag.id}
                    style={{ backgroundColor: tag.color }}
                    className="text-white cursor-pointer pr-1"
                    onClick={() => handleToggleTag(tag.id)}
                  >
                    {tag.name}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
            </div>
          )}

          <ScrollArea className="max-h-40">
            <div className="space-y-0.5">
              {allTags.map(tag => {
                const isSelected = localSelectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.id)}
                    className={`w-full text-left px-3 py-1.5 rounded transition-colors text-sm flex items-center justify-between ${
                      isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </div>
                    {isSelected && <span className="text-xs text-primary font-medium">✓</span>}
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          <Button size="sm" className="w-full" onClick={handleApply}>
            Aplicar Filtro
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
