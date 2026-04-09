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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  LayoutDashboard, Users, FileText, Package, Building, DollarSign,
  ClipboardList, Headphones, BarChart3, Zap, Settings, Info, CalendarDays
} from "lucide-react";
import { usePermissions, useCreateRole } from "@/hooks/usePermissions";
import { CATEGORY_LABELS } from "@/types/permissions";

interface NewRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryIcons: Record<string, React.ElementType> = {
  agenda: CalendarDays,
  dashboard: LayoutDashboard,
  leads: Users,
  deals: FileText,
  products: Package,
  customers: Building,
  financial: DollarSign,
  tasks: ClipboardList,
  tickets: Headphones,
  reports: BarChart3,
  integrations: Zap,
  settings: Settings,
};

export function NewRoleDialog({ open, onOpenChange }: NewRoleDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { data: permissions } = usePermissions();
  const createRole = useCreateRole();

  // Group permissions by category
  const permissionsByCategory = permissions?.reduce((acc, permission) => {
    const category = permission.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>) || {};

  const togglePermission = (permissionId: string, checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedPermissions([...selectedPermissions, permissionId]);
    } else {
      setSelectedPermissions(selectedPermissions.filter(id => id !== permissionId));
    }
  };

  const selectAllPermissions = () => {
    setSelectedPermissions(permissions?.map(p => p.id) || []);
  };

  const deselectAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const countSelectedInCategory = (category: string) => {
    return permissionsByCategory[category]?.filter(p => 
      selectedPermissions.includes(p.id)
    ).length || 0;
  };

  const countTotalInCategory = (category: string) => {
    return permissionsByCategory[category]?.length || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createRole.mutateAsync({
      name,
      description: description || undefined,
      permissionIds: selectedPermissions
    });

    setName("");
    setDescription("");
    setSelectedPermissions([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Role</DialogTitle>
          <DialogDescription>
            Crie um cargo customizado com permissões específicas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Role *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Vendedor, Gerente, etc"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do cargo"
                rows={1}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Permissões</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllPermissions}>
                  Selecionar Todas
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={deselectAllPermissions}>
                  Limpar
                </Button>
              </div>
            </div>

            <Accordion type="multiple" className="w-full">
              {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => {
                const Icon = categoryIcons[category] || Settings;
                return (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{CATEGORY_LABELS[category] || category}</span>
                        <Badge variant="secondary" className="ml-2">
                          {countSelectedInCategory(category)} / {countTotalInCategory(category)}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-6">
                        {categoryPermissions?.map(permission => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission.id}
                              checked={selectedPermissions.includes(permission.id)}
                              onCheckedChange={(checked) => togglePermission(permission.id, checked)}
                            />
                            <Label 
                              htmlFor={permission.id} 
                              className="font-normal text-sm cursor-pointer"
                            >
                              {permission.description || permission.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {selectedPermissions.length} permissões selecionadas
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name || createRole.isPending}>
              {createRole.isPending ? "Criando..." : "Criar Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
