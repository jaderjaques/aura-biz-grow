import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Edit, Trash2, Users } from "lucide-react";
import { useRoles, useDeleteRole } from "@/hooks/usePermissions";
import { NewRoleDialog } from "@/components/roles/NewRoleDialog";
import { EditRoleDialog } from "@/components/roles/EditRoleDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Roles() {
  const [showNewRoleDialog, setShowNewRoleDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [roleToEdit, setRoleToEdit] = useState<{
    id: string;
    name: string;
    description: string | null;
    is_system_role: boolean | null;
  } | null>(null);
  
  const { data: roles, isLoading } = useRoles();
  const deleteRole = useDeleteRole();

  const handleDelete = async () => {
    if (roleToDelete) {
      await deleteRole.mutateAsync(roleToDelete);
      setRoleToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          Carregando roles...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Roles & Permissões</h1>
            <p className="text-muted-foreground">Gerencie cargos e acessos</p>
          </div>
          <Button onClick={() => setShowNewRoleDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Role
          </Button>
        </div>

        {/* Roles Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles?.map((role) => (
            <Card 
              key={role.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                  </div>
                  {role.is_system_role && (
                    <Badge variant="secondary">Sistema</Badge>
                  )}
                </div>
                <CardDescription>{role.description || "Sem descrição"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{role.users_count} usuários</span>
                    </div>
                    <div>
                      <span>{role.permissions_count} permissões</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoleToEdit({
                          id: role.id,
                          name: role.name,
                          description: role.description,
                          is_system_role: role.is_system_role,
                        });
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!role.is_system_role && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoleToDelete(role.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {(!roles || roles.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma role encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Crie a primeira role para organizar as permissões dos usuários.
              </p>
              <Button onClick={() => setShowNewRoleDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Role
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <NewRoleDialog
        open={showNewRoleDialog}
        onOpenChange={setShowNewRoleDialog}
      />

      <EditRoleDialog
        open={!!roleToEdit}
        onOpenChange={(open) => { if (!open) setRoleToEdit(null); }}
        role={roleToEdit}
      />

      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Role</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta role? Os usuários associados a ela perderão suas permissões.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
