import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Building } from "lucide-react";
import { TaskWithDetails } from "@/types/tasks";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface CompleteTaskDialogProps {
  task: TaskWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompleteTaskDialog({
  task,
  open,
  onOpenChange,
}: CompleteTaskDialogProps) {
  const [loading, setLoading] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleComplete = async () => {
    if (!task) return;
    
    if (!completionNotes.trim()) {
      toast({
        title: "Resumo obrigatório",
        description: "Por favor, descreva o que foi feito",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: "done",
          completion_notes: completionNotes,
        })
        .eq("id", task.id);

      if (error) throw error;

      toast({
        title: "Tarefa concluída!",
        description: "O resumo foi registrado no histórico",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });

      setCompletionNotes("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao concluir tarefa:", error);
      toast({
        title: "Erro ao concluir tarefa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCompletionNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Concluir Tarefa
          </DialogTitle>
          <DialogDescription>
            Descreva o que foi feito ou conversado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task info */}
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <p className="font-medium">{task?.title}</p>
            {task?.description && (
              <p className="text-sm text-muted-foreground">{task.description}</p>
            )}
            {(task?.lead || task?.customer) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building className="h-3 w-3" />
                <span>
                  {task.lead?.company_name || task.customer?.company_name}
                </span>
              </div>
            )}
          </div>

          {/* Completion notes field */}
          <div className="space-y-2">
            <Label htmlFor="completion_notes">
              Resumo da Atividade *
            </Label>
            <Textarea
              id="completion_notes"
              rows={5}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder={`Exemplo:

- Cliente confirmou interesse no Plano Pro
- Combinamos reunião para próxima terça às 14h
- Enviou por email os materiais solicitados
- Próximo passo: enviar proposta comercial`}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Este resumo será registrado no histórico do cliente/lead
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleComplete}
            disabled={loading || !completionNotes.trim()}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white"
          >
            {loading ? "Salvando..." : "Concluir Tarefa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
