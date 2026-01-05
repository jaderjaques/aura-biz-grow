import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MessageCircle, Video, FileText } from "lucide-react";

const formSchema = z.object({
  activity_type: z.string().min(1, "Tipo é obrigatório"),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  scheduled_at: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  onSuccess: () => void;
}

const activityTypes = [
  { value: "call", label: "Ligação", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "meeting", label: "Reunião", icon: Video },
  { value: "note", label: "Nota", icon: FileText },
];

export function AddActivityDialog({
  open,
  onOpenChange,
  leadId,
  onSuccess,
}: AddActivityDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activity_type: "",
      title: "",
      description: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!leadId) return;
    
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("activities").insert({
        lead_id: leadId,
        activity_type: data.activity_type,
        title: data.title,
        description: data.description || null,
        scheduled_at: data.scheduled_at || null,
        created_by: user.user?.id,
      });

      if (error) throw error;

      toast({
        title: "Atividade adicionada!",
      });

      reset();
      onSuccess();
    } catch (error) {
      console.error("Error creating activity:", error);
      toast({
        title: "Erro ao criar atividade",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Atividade</DialogTitle>
          <DialogDescription>
            Registre uma interação ou agende uma atividade
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Atividade *</Label>
            <Select onValueChange={(value) => setValue("activity_type", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.activity_type && (
              <p className="text-xs text-destructive">{errors.activity_type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Ex: Ligação de follow-up"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Detalhes da atividade..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled_at">Agendado para (opcional)</Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              {...register("scheduled_at")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gradient-cta text-white">
              {loading ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
