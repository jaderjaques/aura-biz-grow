import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentProfile } from "@/lib/tenant-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Trophy, XCircle } from "lucide-react";

interface PipelineStage {
  id: string;
  name: string;
  description: string | null;
  stage_order: number;
  color: string;
  is_closed_won: boolean;
  is_closed_lost: boolean;
  created_at: string;
  lead_count?: number;
}

export default function PipelineConfig() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStageName, setNewStageName] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchStages = useCallback(async () => {
    const { data, error } = await supabase
      .from("pipeline_stages")
      .select("*")
      .order("stage_order");

    if (error) {
      toast.error("Erro ao carregar etapas");
      return;
    }

    // Get lead counts per stage
    const { data: leads } = await supabase
      .from("leads")
      .select("stage")
      .is("deleted_at", null);

    const counts: Record<string, number> = {};
    leads?.forEach((l) => {
      const s = l.stage?.trim().toLowerCase();
      if (s) counts[s] = (counts[s] || 0) + 1;
    });

    const enriched = (data || []).map((stage) => ({
      ...stage,
      lead_count: counts[stage.name.trim().toLowerCase()] || 0,
    }));

    setStages(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  const handleUpdateName = async (id: string, newName: string) => {
    const { error } = await supabase
      .from("pipeline_stages")
      .update({ name: newName })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar nome");
      return;
    }
    toast.success("Nome atualizado");
    fetchStages();
  };

  const handleUpdateColor = async (id: string, color: string) => {
    await supabase.from("pipeline_stages").update({ color }).eq("id", id);
    fetchStages();
  };

  const handleAdd = async () => {
    if (!newStageName.trim()) return;
    setAdding(true);
    const maxOrder = stages.length > 0 ? Math.max(...stages.map((s) => s.stage_order)) : 0;

    const profile = await getCurrentProfile();
    const { error } = await supabase.from("pipeline_stages").insert({
      name: newStageName.trim(),
      stage_order: maxOrder + 1,
      color: "#6366F1",
      is_closed_won: false,
      is_closed_lost: false,
      tenant_id: profile.tenant_id,
    });

    if (error) {
      toast.error("Erro ao adicionar etapa");
    } else {
      toast.success("Etapa adicionada");
      setNewStageName("");
      fetchStages();
    }
    setAdding(false);
  };

  const handleDelete = async (stage: PipelineStage) => {
    if (stage.lead_count && stage.lead_count > 0) {
      toast.error(`Não é possível deletar: ${stage.lead_count} lead(s) nesta etapa`);
      return;
    }
    if (stage.is_closed_won || stage.is_closed_lost) {
      toast.error("Não é possível deletar etapas de fechamento");
      return;
    }

    const { error } = await supabase.from("pipeline_stages").delete().eq("id", stage.id);
    if (error) {
      toast.error("Erro ao deletar etapa");
    } else {
      toast.success("Etapa removida");
      fetchStages();
    }
  };

  const handleReorder = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= stages.length) return;

    const a = stages[index];
    const b = stages[swapIndex];

    await Promise.all([
      supabase.from("pipeline_stages").update({ stage_order: b.stage_order }).eq("id", a.id),
      supabase.from("pipeline_stages").update({ stage_order: a.stage_order }).eq("id", b.id),
    ]);

    fetchStages();
  };

  const COLORS = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#059669", "#EF4444", "#6366F1", "#14B8A6", "#F97316"];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pipeline de Leads</h1>
          <p className="text-muted-foreground">
            Gerencie as etapas do funil de vendas
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Etapas do Pipeline</CardTitle>
            <CardDescription>
              Arraste ou use as setas para reordenar. Clique no nome para editar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-muted-foreground text-sm">Carregando...</p>
            ) : (
              stages.map((stage, index) => (
                <StageRow
                  key={stage.id}
                  stage={stage}
                  index={index}
                  total={stages.length}
                  colors={COLORS}
                  onUpdateName={handleUpdateName}
                  onUpdateColor={handleUpdateColor}
                  onDelete={handleDelete}
                  onReorder={handleReorder}
                />
              ))
            )}

            {/* Add new stage */}
            <div className="flex items-center gap-2 pt-4 border-t">
              <Input
                placeholder="Nome da nova etapa..."
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="flex-1"
              />
              <Button onClick={handleAdd} disabled={adding || !newStageName.trim()} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function StageRow({
  stage,
  index,
  total,
  colors,
  onUpdateName,
  onUpdateColor,
  onDelete,
  onReorder,
}: {
  stage: PipelineStage;
  index: number;
  total: number;
  colors: string[];
  onUpdateName: (id: string, name: string) => void;
  onUpdateColor: (id: string, color: string) => void;
  onDelete: (stage: PipelineStage) => void;
  onReorder: (index: number, direction: "up" | "down") => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stage.name);

  const handleBlur = () => {
    setEditing(false);
    if (name.trim() && name !== stage.name) {
      onUpdateName(stage.id, name.trim());
    } else {
      setName(stage.name);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

      {/* Color dot */}
      <div className="relative">
        <input
          type="color"
          value={stage.color}
          onChange={(e) => onUpdateColor(stage.id, e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-6 h-6"
        />
        <div
          className="w-4 h-4 rounded-full shrink-0 border"
          style={{ backgroundColor: stage.color }}
        />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === "Enter" && handleBlur()}
            autoFocus
            className="h-7 text-sm"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-left truncate hover:underline"
          >
            {stage.name}
          </button>
        )}
      </div>

      {/* Badges */}
      {stage.is_closed_won && (
        <Badge variant="outline" className="text-green-600 border-green-300 gap-1 shrink-0">
          <Trophy className="h-3 w-3" /> Ganho
        </Badge>
      )}
      {stage.is_closed_lost && (
        <Badge variant="outline" className="text-red-600 border-red-300 gap-1 shrink-0">
          <XCircle className="h-3 w-3" /> Perdido
        </Badge>
      )}

      {/* Lead count */}
      <Badge variant="secondary" className="shrink-0">
        {stage.lead_count || 0} leads
      </Badge>

      {/* Reorder buttons */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          disabled={index === 0}
          onClick={() => onReorder(index, "up")}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          disabled={index === total - 1}
          onClick={() => onReorder(index, "down")}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onDelete(stage)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
