import { useState, useEffect } from "react";
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
  ClipboardList, Headphones, BarChart3, Zap, Settings, Info,
  CalendarDays, Stethoscope, DoorOpen,
} from "lucide-react";
import { usePermissions, useRolePermissions, useUpdateRolePermissions } from "@/hooks/usePermissions";
import { CATEGORY_LABELS } from "@/types/permissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: {
    id: string;
    name: string;
    description: string | null;
    is_system_role: boolean | null;
  } | null;
}

const categoryIcons: Record<string, React.ElementType> = {
  agenda: CalendarDays,
  consultorios: DoorOpen,
  contracts: FileText,
  customers: Building,
  dashboard: LayoutDashboard,
  deals: FileText,
  financial: DollarSign,
  integrations: Zap,
  leads: Users,
  products: Package,
  profissionais: Stethoscope,
  reports: BarChart3,
  settings: Settings,
  tasks: ClipboardList,
  tickets: Headphones,
};

export function EditRoleDialog({ open, onOpenChange, role }: EditRoleDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: permissions } = usePermissions();
  const { data: currentPermissions } = useRolePermissions(role?.id ?? null);
  const updateRolePermissions = useUpdateRolePermissions();
  const queryClient = useQueryClient();

  // Populate fields when role changes
  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description ?? "");
    }
  }, [role]);

  // Populate selected permissions when loaded
  useEffect(() => {
    if (currentPermissions) {
      setSelectedPermissions(currentPermissions);
    }
  }, [currentPermissions]);

  const permissionsByCategory = permissions?.reduce((acc, permission) => {
    const category = permission.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>) || {};

  const togglePermission = (permissionId: string, checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedPermissions((prev) => [...prev, permissionId]);
    } else {
      setSelectedPermissions((prev) => prev.filter((id) => id !== permissionId));
    }
  };

  const selectAll = () => setSelectedPermissions(permissions?.map((p) => p.id) ?? []);
  const clearAll = () => setSelectedPermissions([]);

  const countSelected = (category: string) =>
    permissionsByCategory[category]?.filter((p) => selectedPermissions.includes(p.id)).length ?? 0;
  const countTotal = (category: string) => permissionsByCategory[category]?.length ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setIsSaving(true);

    try {
      // Update name/description only for non-system roles
      if (!role.is_system_role) {
        const { error } = await supabase
          .from("roles")
          .update({ name, description: description || null })
          .eq("id", role.id);
        if (error) throw error;
      }

      // Always update permissions
      await updateRolePermissions.mutateAsync({
        roleId: role.id,
        permissionIds: selectedPermissions,
      });

      queryClient.invalidateQueries({ queryKey: ["roles-with-details"] });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tente novamente.";
      toast.error("Erro ao salvar role", { description: msg });
    } finally {
      setIsSaving(false);
    }
  };

  if (!role) return null;

  const isSystem = role.is_system_role === true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar Role
            {isSystem && <Badge variant="secondary">Sistema</Badge>}
          </DialogTitle>
          <DialogDescription>
            {isSystem
              ? "Roles de sistema têm nome fixo. Você pode ajustar as permissões livremente."
              : "Edite o nome, descrição e permissões desta role."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome da Role *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSystem}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={1}
                disabled={isSystem}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Permissões</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                  Selecionar Todas
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearAll}>
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
                          {countSelected(category)} / {countTotal(category)}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-6">
                        {categoryPermissions?.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-${permission.id}`}
                              checked={selectedPermissions.includes(permission.id)}
                              onCheckedChange={(checked) =>
                                togglePermission(permission.id, checked)
                              }
                            />
                            <Label
                              htmlFor={`edit-${permission.id}`}
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
            <AlertDescription>{selectedPermissions.length} permissões selecionadas</AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
