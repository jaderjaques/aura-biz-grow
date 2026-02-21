import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign, Users, Target, Calendar,
  CheckCircle, Edit, Save, Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface BANTData {
  bant_budget?: string | null;
  bant_budget_value?: number | null;
  bant_budget_notes?: string | null;
  bant_authority?: string | null;
  bant_authority_notes?: string | null;
  bant_need?: string | null;
  bant_need_description?: string | null;
  bant_timeline?: string | null;
  bant_timeline_date?: string | null;
  bant_timeline_notes?: string | null;
  bant_score?: number | null;
  bant_qualified?: boolean | null;
}

interface BANTQualificationProps {
  lead: BANTData & { id: string };
  onUpdate: () => void;
  editable?: boolean;
}

function getBudgetScore(budget: string): number {
  const scores: Record<string, number> = { defined: 25, estimated: 15, unclear: 5, none: 0 };
  return scores[budget] || 0;
}
function getAuthorityScore(authority: string): number {
  const scores: Record<string, number> = { decision_maker: 25, influencer: 15, gatekeeper: 5, user: 0 };
  return scores[authority] || 0;
}
function getNeedScore(need: string): number {
  const scores: Record<string, number> = { critical: 25, important: 15, nice_to_have: 5, unclear: 0 };
  return scores[need] || 0;
}
function getTimelineScore(timeline: string): number {
  const scores: Record<string, number> = { immediate: 25, short_term: 20, medium_term: 10, long_term: 5 };
  return scores[timeline] || 0;
}

function getBudgetLabel(budget: string): string {
  const labels: Record<string, string> = { defined: 'Definido (>R$ 50k)', estimated: 'Estimado (R$ 10-50k)', unclear: 'Pouco claro (<R$ 10k)', none: 'Sem orçamento' };
  return labels[budget] || 'Não informado';
}
function getAuthorityLabel(authority: string): string {
  const labels: Record<string, string> = { decision_maker: 'Tomador de Decisão', influencer: 'Influenciador', gatekeeper: 'Gatekeeper', user: 'Usuário Final' };
  return labels[authority] || 'Não informado';
}
function getNeedLabel(need: string): string {
  const labels: Record<string, string> = { critical: 'Crítica', important: 'Importante', nice_to_have: 'Desejável', unclear: 'Pouco clara' };
  return labels[need] || 'Não informado';
}
function getTimelineLabel(timeline: string): string {
  const labels: Record<string, string> = { immediate: 'Imediato (<30 dias)', short_term: 'Curto prazo (1-3 meses)', medium_term: 'Médio prazo (3-6 meses)', long_term: 'Longo prazo (>6 meses)' };
  return labels[timeline] || 'Não informado';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function BANTQualification({ lead, onUpdate, editable = true }: BANTQualificationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    bant_budget: lead.bant_budget || '',
    bant_budget_value: lead.bant_budget_value?.toString() || '',
    bant_budget_notes: lead.bant_budget_notes || '',
    bant_authority: lead.bant_authority || '',
    bant_authority_notes: lead.bant_authority_notes || '',
    bant_need: lead.bant_need || '',
    bant_need_description: lead.bant_need_description || '',
    bant_timeline: lead.bant_timeline || '',
    bant_timeline_date: lead.bant_timeline_date || '',
    bant_timeline_notes: lead.bant_timeline_notes || '',
  });

  const bantScore = lead.bant_score || 0;
  const isQualified = lead.bant_qualified || false;

  async function handleSave() {
    setLoading(true);
    try {
      const updateData: Record<string, unknown> = {
        bant_budget: formData.bant_budget || null,
        bant_budget_value: formData.bant_budget_value ? parseFloat(formData.bant_budget_value) : null,
        bant_budget_notes: formData.bant_budget_notes || null,
        bant_authority: formData.bant_authority || null,
        bant_authority_notes: formData.bant_authority_notes || null,
        bant_need: formData.bant_need || null,
        bant_need_description: formData.bant_need_description || null,
        bant_timeline: formData.bant_timeline || null,
        bant_timeline_date: formData.bant_timeline_date || null,
        bant_timeline_notes: formData.bant_timeline_notes || null,
      };

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id);

      if (error) throw error;

      toast({ title: 'Qualificação BANT atualizada!' });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Erro ao salvar BANT:', error);
      toast({ title: 'Erro ao salvar qualificação', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const criteriaScores = {
    budget: getBudgetScore(formData.bant_budget),
    authority: getAuthorityScore(formData.bant_authority),
    need: getNeedScore(formData.bant_need),
    timeline: getTimelineScore(formData.bant_timeline),
  };

  const renderViewField = (label: string, value: string | null, formatter?: (v: string) => string) => {
    if (!value) return <p className="text-muted-foreground">Não preenchido</p>;
    return (
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium">{formatter ? formatter(value) : value}</span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Qualificação BANT
            </CardTitle>
            <CardDescription className="text-xs">
              Budget • Authority • Need • Timeline
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {isQualified && (
              <Badge variant="default" className="bg-green-600 text-xs">
                <CheckCircle className="mr-1 h-3 w-3" />
                Qualificado
              </Badge>
            )}
            {editable && (
              isEditing ? (
                <Button size="sm" onClick={handleSave} disabled={loading}>
                  {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                  Salvar
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-1 h-3 w-3" />
                  Editar
                </Button>
              )
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Geral */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Score BANT</span>
            <span className="font-bold">{bantScore}/100</span>
          </div>
          <Progress value={bantScore} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {bantScore >= 75 ? '✓ Altamente qualificado' :
             bantScore >= 60 ? '✓ Qualificado' :
             bantScore >= 40 ? '⚠️ Parcialmente qualificado' :
             '❌ Não qualificado'}
          </p>
        </div>

        <Separator />

        {/* Budget */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <h4 className="font-semibold text-sm">Budget (Orçamento)</h4>
            <Badge variant="outline" className="text-xs">{criteriaScores.budget}/25</Badge>
          </div>
          {isEditing ? (
            <div className="space-y-2 pl-6">
              <div>
                <Label className="text-xs">Status do Orçamento</Label>
                <Select value={formData.bant_budget} onValueChange={(v) => setFormData({ ...formData, bant_budget: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="defined">Definido (&gt;R$ 50k) - 25 pts</SelectItem>
                    <SelectItem value="estimated">Estimado (R$ 10-50k) - 15 pts</SelectItem>
                    <SelectItem value="unclear">Pouco claro (&lt;R$ 10k) - 5 pts</SelectItem>
                    <SelectItem value="none">Sem orçamento - 0 pts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Valor (R$)</Label>
                <Input className="h-8 text-xs" type="number" value={formData.bant_budget_value} onChange={(e) => setFormData({ ...formData, bant_budget_value: e.target.value })} placeholder="50000" />
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea rows={2} className="text-xs" value={formData.bant_budget_notes} onChange={(e) => setFormData({ ...formData, bant_budget_notes: e.target.value })} placeholder="Ex: Orçamento aprovado..." />
              </div>
            </div>
          ) : (
            <div className="pl-6 space-y-1 text-xs">
              {renderViewField('Status', formData.bant_budget, getBudgetLabel)}
              {formData.bant_budget_value && renderViewField('Valor', formData.bant_budget_value, (v) => formatCurrency(parseFloat(v)))}
              {formData.bant_budget_notes && <p className="text-muted-foreground italic">{formData.bant_budget_notes}</p>}
            </div>
          )}
        </div>

        <Separator />

        {/* Authority */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <h4 className="font-semibold text-sm">Authority (Autoridade)</h4>
            <Badge variant="outline" className="text-xs">{criteriaScores.authority}/25</Badge>
          </div>
          {isEditing ? (
            <div className="space-y-2 pl-6">
              <div>
                <Label className="text-xs">Nível de Autoridade</Label>
                <Select value={formData.bant_authority} onValueChange={(v) => setFormData({ ...formData, bant_authority: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="decision_maker">Tomador de Decisão - 25 pts</SelectItem>
                    <SelectItem value="influencer">Influenciador - 15 pts</SelectItem>
                    <SelectItem value="gatekeeper">Gatekeeper - 5 pts</SelectItem>
                    <SelectItem value="user">Usuário Final - 0 pts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea rows={2} className="text-xs" value={formData.bant_authority_notes} onChange={(e) => setFormData({ ...formData, bant_authority_notes: e.target.value })} placeholder="Ex: CEO com poder de decisão..." />
              </div>
            </div>
          ) : (
            <div className="pl-6 space-y-1 text-xs">
              {renderViewField('Nível', formData.bant_authority, getAuthorityLabel)}
              {formData.bant_authority_notes && <p className="text-muted-foreground italic">{formData.bant_authority_notes}</p>}
            </div>
          )}
        </div>

        <Separator />

        {/* Need */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-red-500" />
            <h4 className="font-semibold text-sm">Need (Necessidade)</h4>
            <Badge variant="outline" className="text-xs">{criteriaScores.need}/25</Badge>
          </div>
          {isEditing ? (
            <div className="space-y-2 pl-6">
              <div>
                <Label className="text-xs">Urgência da Necessidade</Label>
                <Select value={formData.bant_need} onValueChange={(v) => setFormData({ ...formData, bant_need: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Crítica - 25 pts</SelectItem>
                    <SelectItem value="important">Importante - 15 pts</SelectItem>
                    <SelectItem value="nice_to_have">Desejável - 5 pts</SelectItem>
                    <SelectItem value="unclear">Pouco clara - 0 pts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea rows={2} className="text-xs" value={formData.bant_need_description} onChange={(e) => setFormData({ ...formData, bant_need_description: e.target.value })} placeholder="Ex: Empresa perdendo clientes..." />
              </div>
            </div>
          ) : (
            <div className="pl-6 space-y-1 text-xs">
              {renderViewField('Urgência', formData.bant_need, getNeedLabel)}
              {formData.bant_need_description && <p className="text-muted-foreground italic">{formData.bant_need_description}</p>}
            </div>
          )}
        </div>

        <Separator />

        {/* Timeline */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-sm">Timeline (Prazo)</h4>
            <Badge variant="outline" className="text-xs">{criteriaScores.timeline}/25</Badge>
          </div>
          {isEditing ? (
            <div className="space-y-2 pl-6">
              <div>
                <Label className="text-xs">Prazo de Decisão</Label>
                <Select value={formData.bant_timeline} onValueChange={(v) => setFormData({ ...formData, bant_timeline: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Imediato (&lt;30 dias) - 25 pts</SelectItem>
                    <SelectItem value="short_term">Curto prazo (1-3 meses) - 20 pts</SelectItem>
                    <SelectItem value="medium_term">Médio prazo (3-6 meses) - 10 pts</SelectItem>
                    <SelectItem value="long_term">Longo prazo (&gt;6 meses) - 5 pts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Data Esperada</Label>
                <Input className="h-8 text-xs" type="date" value={formData.bant_timeline_date} onChange={(e) => setFormData({ ...formData, bant_timeline_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea rows={2} className="text-xs" value={formData.bant_timeline_notes} onChange={(e) => setFormData({ ...formData, bant_timeline_notes: e.target.value })} placeholder="Ex: Aguardando aprovação..." />
              </div>
            </div>
          ) : (
            <div className="pl-6 space-y-1 text-xs">
              {renderViewField('Prazo', formData.bant_timeline, getTimelineLabel)}
              {formData.bant_timeline_date && renderViewField('Data', formData.bant_timeline_date, (v) => format(new Date(v), 'dd/MM/yyyy'))}
              {formData.bant_timeline_notes && <p className="text-muted-foreground italic">{formData.bant_timeline_notes}</p>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
