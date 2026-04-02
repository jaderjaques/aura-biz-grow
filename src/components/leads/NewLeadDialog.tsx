import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Lead } from "@/types/leads";
import { Building2, User, Phone, Globe } from "lucide-react";

const formSchema = z.object({
  company_name: z.string().min(1, "Nome da empresa é obrigatório"),
  cnpj: z.string().optional(),
  segment: z.string().optional(),
  contact_name: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  website: z.string().optional(),
  instagram: z.string().optional(),
  needs: z.string().optional(),
  estimated_value: z.string().optional(),
  assigned_to: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface NewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tags: Tag[];
}

export function NewLeadDialog({ open, onOpenChange, onSuccess, tags }: NewLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [pipelineStages, setPipelineStages] = useState<{ id: string; name: string }[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: "",
      phone: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      const [usersRes, stagesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").eq("status", "active").order("full_name"),
        supabase.from("pipeline_stages").select("id, name").order("stage_order"),
      ]);
      if (usersRes.data) setUsers(usersRes.data);
      if (stagesRes.data) {
        setPipelineStages(stagesRes.data);
        if (stagesRes.data.length > 0 && !selectedStage) {
          setSelectedStage(stagesRes.data[0].name);
        }
      }
    };
    fetchData();
  }, []);

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      
      const { data: newLead, error } = await supabase
        .from("leads")
        .insert({
          company_name: data.company_name,
          cnpj: data.cnpj || null,
          segment: data.segment || null,
          contact_name: data.contact_name || null,
          position: data.position || null,
          phone: data.phone,
          email: data.email || null,
          website: data.website || null,
          instagram: data.instagram || null,
          needs: data.needs || null,
          estimated_value: data.estimated_value ? parseFloat(data.estimated_value) : null,
          assigned_to: data.assigned_to || null,
          assigned_at: data.assigned_to ? new Date().toISOString() : null,
          source: "manual",
          status: "novo",
          stage: selectedStage || "Contato Inicial",
          created_by: authUser.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add tags
      if (selectedTags.length > 0 && newLead) {
        await supabase.from("lead_tags").insert(
          selectedTags.map((tagId) => ({
            lead_id: newLead.id,
            tag_id: tagId,
          }))
        );
      }

      reset();
      setSelectedTags([]);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating lead:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>
            Adicione um novo lead ao CRM
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Dados da Empresa */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Dados da Empresa
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Nome da Empresa *</Label>
                  <Input
                    id="company_name"
                    {...register("company_name")}
                    placeholder="Ex: Clínica ABC"
                  />
                  {errors.company_name && (
                    <p className="text-xs text-destructive">{errors.company_name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    {...register("cnpj")}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="segment">Segmento</Label>
                  <Select onValueChange={(value) => setValue("segment", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinica">Clínica</SelectItem>
                      <SelectItem value="escritorio">Escritório</SelectItem>
                      <SelectItem value="consultoria">Consultoria</SelectItem>
                      <SelectItem value="comercio">Comércio</SelectItem>
                      <SelectItem value="servicos">Serviços</SelectItem>
                      <SelectItem value="industria">Indústria</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contato Principal */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Contato Principal
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Nome do Contato</Label>
                  <Input
                    id="contact_name"
                    {...register("contact_name")}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Cargo</Label>
                  <Input
                    id="position"
                    {...register("position")}
                    placeholder="Ex: Gerente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="(00) 00000-0000"
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="email@empresa.com"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Presença Digital */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Globe className="h-4 w-4" />
                Presença Digital
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    {...register("website")}
                    placeholder="https://www.empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    {...register("instagram")}
                    placeholder="@empresa"
                  />
                </div>
              </div>
            </div>

            {/* Qualificação */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Phone className="h-4 w-4" />
                Qualificação
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="needs">Necessidades / Dores</Label>
                  <Textarea
                    id="needs"
                    {...register("needs")}
                    placeholder="Descreva as principais necessidades do lead..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Etapa do Pipeline</Label>
                    <Select value={selectedStage} onValueChange={setSelectedStage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma etapa" />
                      </SelectTrigger>
                      <SelectContent>
                        {pipelineStages.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimated_value">Valor Estimado (R$)</Label>
                    <Input
                      id="estimated_value"
                      type="number"
                      step="0.01"
                      {...register("estimated_value")}
                      placeholder="0,00"
                    />
                  </div>
                 </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Atribuir a</Label>
                    <Select onValueChange={(value) => setValue("assigned_to", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                        className="cursor-pointer transition-colors"
                        onClick={() => toggleTag(tag.id)}
                        style={{
                          backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                          borderColor: tag.color,
                          color: selectedTags.includes(tag.id) ? "white" : tag.color,
                        }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit(onSubmit)} 
            disabled={loading}
            className="gradient-cta text-white"
          >
            {loading ? "Salvando..." : "Criar Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
