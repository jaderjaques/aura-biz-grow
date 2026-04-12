import { useState, useEffect } from "react";
import { useTenantModule } from "@/hooks/useTenantModule";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Trophy,
  Edit,
  Trash2,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

interface Goal {
  id: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  period_start: string;
  period_end: string;
  description: string | null;
  created_by: string | null;
  progress?: number;
  status?: string;
}

// typeLabels is built dynamically inside the component using newCustomersLabel
const baseTypeLabels: Record<string, string> = {
  monthly_revenue: "Receita Mensal",
  mrr: "MRR",
  churn_rate: "Taxa de Churn",
};

const typeIcons: Record<string, typeof DollarSign> = {
  monthly_revenue: DollarSign,
  mrr: RefreshCw,
  new_customers: Users,
  churn_rate: TrendingUp,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(value || 0);
}

export function GoalsTab() {
  const { user } = useAuth();
  const { isClinic } = useTenantModule();
  const newCustomersLabel = isClinic ? "Novos Pacientes" : "Novos Clientes";
  const newCustomersHint = isClinic ? "Quantidade de novos pacientes" : "Quantidade de novos clientes";
  const typeLabels: Record<string, string> = {
    ...baseTypeLabels,
    new_customers: newCustomersLabel,
  };
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    goal_type: "monthly_revenue",
    target_value: "",
    period_start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    period_end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    description: "",
  });

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("financial_goals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate progress for each goal client-side
      const goalsWithProgress = await Promise.all(
        (data || []).map(async (goal: any) => {
          const progress = await calculateProgress(goal);
          return { ...goal, ...progress };
        })
      );

      setGoals(goalsWithProgress);
    } catch (error) {
      console.error("Erro ao carregar metas:", error);
      toast.error("Erro ao carregar metas");
    } finally {
      setLoading(false);
    }
  }

  async function calculateProgress(goal: any) {
    let currentValue = 0;

    try {
      if (goal.goal_type === "monthly_revenue") {
        const { data } = await supabase
          .from("cash_transactions")
          .select("amount")
          .eq("type", "revenue")
          .gte("transaction_date", goal.period_start)
          .lte("transaction_date", goal.period_end);
        currentValue = data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      } else if (goal.goal_type === "mrr") {
        const { data } = await supabase
          .from("customers")
          .select("monthly_value")
          .eq("status", "active");
        currentValue = data?.reduce((sum, c) => sum + (Number(c.monthly_value) || 0), 0) || 0;
      } else if (goal.goal_type === "new_customers") {
        const { data } = await supabase
          .from("customers")
          .select("id")
          .gte("customer_since", goal.period_start)
          .lte("customer_since", goal.period_end);
        currentValue = data?.length || 0;
      } else if (goal.goal_type === "churn_rate") {
        const { data: active } = await supabase
          .from("customers")
          .select("id")
          .eq("status", "active");
        const { data: cancelled } = await supabase
          .from("customers")
          .select("id")
          .eq("status", "cancelled")
          .gte("updated_at", goal.period_start)
          .lte("updated_at", goal.period_end);
        const total = (active?.length || 0) + (cancelled?.length || 0);
        currentValue = total > 0 ? ((cancelled?.length || 0) / total) * 100 : 0;
      }
    } catch (err) {
      console.error("Erro ao calcular progresso:", err);
    }

    const progress = goal.target_value > 0 ? (currentValue / goal.target_value) * 100 : 0;
    let status = "behind";
    if (progress >= 100) status = "achieved";
    else if (progress >= 75) status = "on_track";
    else if (progress >= 50) status = "at_risk";

    // Update current_value in DB
    await supabase
      .from("financial_goals")
      .update({ current_value: currentValue })
      .eq("id", goal.id);

    return { current_value: currentValue, progress, status };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const dataToSave = {
        goal_type: formData.goal_type,
        target_value: parseFloat(formData.target_value),
        period_start: formData.period_start,
        period_end: formData.period_end,
        description: formData.description || null,
        created_by: user?.id || null,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from("financial_goals")
          .update(dataToSave)
          .eq("id", editingGoal.id);
        if (error) throw error;
        toast.success("Meta atualizada!");
      } else {
        const { error } = await supabase
          .from("financial_goals")
          .insert([dataToSave]);
        if (error) throw error;
        toast.success("Meta criada!");
      }

      setIsNewGoalOpen(false);
      setEditingGoal(null);
      resetForm();
      loadGoals();
    } catch (error) {
      console.error("Erro ao salvar meta:", error);
      toast.error("Erro ao salvar meta");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(goalId: string) {
    if (!confirm("Tem certeza que deseja excluir esta meta?")) return;

    try {
      const { error } = await supabase
        .from("financial_goals")
        .delete()
        .eq("id", goalId);
      if (error) throw error;
      toast.success("Meta excluída!");
      loadGoals();
    } catch (error) {
      console.error("Erro ao excluir meta:", error);
      toast.error("Erro ao excluir meta");
    }
  }

  function resetForm() {
    setFormData({
      goal_type: "monthly_revenue",
      target_value: "",
      period_start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      period_end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
      description: "",
    });
  }

  function openEditModal(goal: Goal) {
    setEditingGoal(goal);
    setFormData({
      goal_type: goal.goal_type,
      target_value: goal.target_value.toString(),
      period_start: goal.period_start,
      period_end: goal.period_end,
      description: goal.description || "",
    });
    setIsNewGoalOpen(true);
  }

  const achievedGoals = goals.filter((g) => (g.progress || 0) >= 100);
  const onTrackGoals = goals.filter((g) => (g.progress || 0) >= 75 && (g.progress || 0) < 100);
  const atRiskGoals = goals.filter((g) => (g.progress || 0) >= 50 && (g.progress || 0) < 75);
  const behindGoals = goals.filter((g) => (g.progress || 0) < 50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Metas Financeiras</h2>
          <p className="text-muted-foreground">Defina e acompanhe seus objetivos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadGoals} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setEditingGoal(null);
              setIsNewGoalOpen(true);
            }}
            className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Meta
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-success" />
              <p className="text-sm text-muted-foreground">Alcançadas</p>
            </div>
            <p className="text-2xl font-bold text-success">{achievedGoals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">No Caminho</p>
            </div>
            <p className="text-2xl font-bold text-primary">{onTrackGoals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <p className="text-sm text-muted-foreground">Em Risco</p>
            </div>
            <p className="text-2xl font-bold text-yellow-500">{atRiskGoals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-muted-foreground">Atrasadas</p>
            </div>
            <p className="text-2xl font-bold text-destructive">{behindGoals.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Metas */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <Target className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Nenhuma meta definida</h3>
              <p className="text-muted-foreground">
                Crie sua primeira meta para acompanhar o progresso
              </p>
              <Button onClick={() => setIsNewGoalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Meta
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              typeLabels={typeLabels}
              onEdit={() => openEditModal(goal)}
              onDelete={() => handleDelete(goal.id)}
            />
          ))}
        </div>
      )}

      {/* Modal Nova/Editar Meta */}
      <Dialog open={isNewGoalOpen} onOpenChange={setIsNewGoalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Editar Meta" : "Nova Meta"}</DialogTitle>
            <DialogDescription>Defina uma meta financeira para acompanhar</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Meta *</Label>
              <Select
                value={formData.goal_type}
                onValueChange={(value) => setFormData({ ...formData, goal_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly_revenue">Receita Mensal</SelectItem>
                  <SelectItem value="mrr">MRR (Receita Recorrente)</SelectItem>
                  <SelectItem value="new_customers">{newCustomersLabel}</SelectItem>
                  <SelectItem value="churn_rate">Taxa de Churn (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor da Meta *</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                placeholder={formData.goal_type === "new_customers" ? "10" : "50000"}
              />
              <p className="text-xs text-muted-foreground">
                {formData.goal_type === "new_customers"
                  ? newCustomersHint
                  : formData.goal_type === "churn_rate"
                  ? "Percentual máximo aceitável"
                  : "Valor em R$"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início *</Label>
                <Input
                  type="date"
                  required
                  value={formData.period_start}
                  onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fim *</Label>
                <Input
                  type="date"
                  required
                  value={formData.period_end}
                  onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Meta de receita para Q1 2026"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsNewGoalOpen(false);
                  setEditingGoal(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : editingGoal ? "Atualizar" : "Criar Meta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalCard({
  goal,
  typeLabels,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  typeLabels: Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const progress = goal.progress || 0;
  const status = goal.status || "behind";

  const statusConfig: Record<string, { label: string; badgeClass: string; icon: typeof Trophy; textClass: string; borderClass: string }> = {
    achieved: {
      label: "Alcançada",
      badgeClass: "bg-success text-success-foreground",
      icon: Trophy,
      textClass: "text-success",
      borderClass: "border-l-success",
    },
    on_track: {
      label: "No Caminho",
      badgeClass: "bg-primary text-primary-foreground",
      icon: TrendingUp,
      textClass: "text-primary",
      borderClass: "border-l-primary",
    },
    at_risk: {
      label: "Em Risco",
      badgeClass: "bg-yellow-500 text-white",
      icon: AlertCircle,
      textClass: "text-yellow-500",
      borderClass: "border-l-yellow-500",
    },
    behind: {
      label: "Atrasada",
      badgeClass: "bg-destructive text-destructive-foreground",
      icon: AlertCircle,
      textClass: "text-destructive",
      borderClass: "border-l-destructive",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const TypeIcon = typeIcons[goal.goal_type] || Target;

  return (
    <Card className={`border-l-4 ${config.borderClass}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">{typeLabels[goal.goal_type] || goal.goal_type}</CardTitle>
              <CardDescription className="text-xs">
                {format(new Date(goal.period_start), "dd/MM/yyyy")} até{" "}
                {format(new Date(goal.period_end), "dd/MM/yyyy")}
              </CardDescription>
            </div>
          </div>
          <Badge className={config.badgeClass}>
            <Icon className="mr-1 h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goal.description && (
          <p className="text-sm text-muted-foreground">{goal.description}</p>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso</span>
            <span className={`text-lg font-bold ${config.textClass}`}>
              {progress.toFixed(0)}%
            </span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-3" />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-muted-foreground">Atual</p>
            <p className="font-semibold">
              {goal.goal_type === "new_customers" || goal.goal_type === "churn_rate"
                ? Number(goal.current_value).toFixed(0)
                : formatCurrency(Number(goal.current_value))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Meta</p>
            <p className="font-semibold">
              {goal.goal_type === "new_customers" || goal.goal_type === "churn_rate"
                ? Number(goal.target_value).toFixed(0)
                : formatCurrency(Number(goal.target_value))}
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Edit className="mr-2 h-3 w-3" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-3 w-3" />
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
