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
import { useCreateTemplate } from "@/hooks/useIntegrations";
import { TEMPLATE_VARIABLES } from "@/types/integrations";
import { toast } from "sonner";

interface NewTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTemplateDialog({ open, onOpenChange }: NewTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateType, setTemplateType] = useState("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");

  const createTemplate = useCreateTemplate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!body.trim()) {
      toast.error("Corpo da mensagem é obrigatório");
      return;
    }

    try {
      await createTemplate.mutateAsync({
        name,
        description: description || undefined,
        template_type: templateType,
        subject: templateType === "email" ? subject : undefined,
        body,
        category: category || undefined,
      });
      handleClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setTemplateType("email");
    setSubject("");
    setBody("");
    setCategory("");
    onOpenChange(false);
  };

  const insertVariable = (variable: string) => {
    setBody((prev) => prev + variable);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Template</DialogTitle>
          <DialogDescription>
            Crie um template de mensagem com variáveis dinâmicas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Ex: Bem-vindo Cliente"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateType">Tipo *</Label>
              <Select value={templateType} onValueChange={setTemplateType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Breve descrição do template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="welcome">Boas-vindas</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
                <SelectItem value="reminder">Lembrete</SelectItem>
                <SelectItem value="notification">Notificação</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {templateType === "email" && (
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                placeholder="Assunto do email..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="body">Corpo da Mensagem *</Label>
            <Textarea
              id="body"
              rows={8}
              placeholder="Digite a mensagem..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Inserir Variável</Label>
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_VARIABLES.map((variable) => (
                <Badge
                  key={variable}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                  onClick={() => insertVariable(variable)}
                >
                  {variable}
                </Badge>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" className="gradient-bg" disabled={createTemplate.isPending}>
              {createTemplate.isPending ? "Criando..." : "Criar Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
