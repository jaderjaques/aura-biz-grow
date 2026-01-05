import { useState } from "react";
import { FileText, Plus, MoreVertical, Trash2, Eye, Copy, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMessageTemplates, useDeleteTemplate } from "@/hooks/useIntegrations";
import { TEMPLATE_VARIABLES } from "@/types/integrations";
import { NewTemplateDialog } from "./NewTemplateDialog";

export function TemplatesTab() {
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const { data: templates = [], isLoading } = useMessageTemplates();
  const deleteTemplate = useDeleteTemplate();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "whatsapp":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Templates de Mensagens</h3>
          <p className="text-sm text-muted-foreground">
            Crie templates reutilizáveis com variáveis dinâmicas
          </p>
        </div>
        <Button onClick={() => setNewDialogOpen(true)} className="gradient-bg">
          <Plus className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </div>

      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-2">Variáveis disponíveis:</p>
          <div className="flex flex-wrap gap-1">
            {TEMPLATE_VARIABLES.map((variable) => (
              <Badge key={variable} variant="outline" className="text-xs font-mono">
                {variable}
              </Badge>
            ))}
          </div>
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Nenhum Template</h3>
            <p className="text-muted-foreground mb-4">
              Crie templates para automatizar mensagens
            </p>
            <Button onClick={() => setNewDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{template.name}</h4>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getTypeIcon(template.template_type)}
                        {template.template_type}
                      </Badge>
                      {template.category && (
                        <Badge variant="secondary">{template.category}</Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">{template.description}</p>

                    {template.subject && (
                      <div className="text-sm">
                        <span className="font-medium">Assunto: </span>
                        <span className="text-muted-foreground">{template.subject}</span>
                      </div>
                    )}

                    <div className="bg-muted p-2 rounded text-sm whitespace-pre-wrap line-clamp-3">
                      {template.body}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="ml-2">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => deleteTemplate.mutate(template.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Deletar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewTemplateDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />
    </div>
  );
}
