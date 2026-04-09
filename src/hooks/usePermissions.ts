import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Permission, RoleWithDetails, PermissionsByCategory, AuditLog } from "@/types/permissions";

export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("category")
        .order("name");

      if (error) throw error;
      return data as Permission[];
    }
  });
}

export function usePermissionsByCategory() {
  const { data: permissions } = usePermissions();

  const grouped: PermissionsByCategory = {};
  permissions?.forEach(permission => {
    const category = permission.category || 'other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(permission);
  });

  return grouped;
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles-with-details"],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("roles")
        .select("*")
        .order("name");

      if (rolesError) throw rolesError;

      const rolesWithDetails: RoleWithDetails[] = await Promise.all(
        roles.map(async (role) => {
          const { count: usersCount } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role_id", role.id);

          const { count: permissionsCount } = await supabase
            .from("role_permissions")
            .select("*", { count: "exact", head: true })
            .eq("role_id", role.id);

          return {
            ...role,
            users_count: usersCount || 0,
            permissions_count: permissionsCount || 0
          };
        })
      );

      return rolesWithDetails;
    }
  });
}

export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: ["role-permissions", roleId],
    queryFn: async () => {
      if (!roleId) return [];

      const { data, error } = await supabase
        .from("role_permissions")
        .select("permission_id")
        .eq("role_id", roleId);

      if (error) throw error;
      return data.map(rp => rp.permission_id);
    },
    enabled: !!roleId
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      permissionIds
    }: {
      name: string;
      description?: string;
      permissionIds: string[]
    }) => {
      // Fetch current user's tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.tenant_id) throw new Error("Tenant não encontrado.");

      // Create role with tenant_id
      const { data: role, error: roleError } = await supabase
        .from("roles")
        .insert([{ name, description, tenant_id: profile.tenant_id }])
        .select()
        .single();

      if (roleError) throw roleError;

      // Assign permissions
      if (permissionIds.length > 0) {
        const rolePermissions = permissionIds.map(permissionId => ({
          role_id: role.id,
          permission_id: permissionId
        }));

        const { error: permError } = await supabase
          .from("role_permissions")
          .insert(rolePermissions);

        if (permError) throw permError;
      }

      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles-with-details"] });
      toast.success("Role criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar role: " + error.message);
    }
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      roleId, 
      permissionIds 
    }: { 
      roleId: string; 
      permissionIds: string[] 
    }) => {
      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId);

      if (deleteError) throw deleteError;

      // Insert new permissions
      if (permissionIds.length > 0) {
        const rolePermissions = permissionIds.map(permissionId => ({
          role_id: roleId,
          permission_id: permissionId
        }));

        const { error: insertError } = await supabase
          .from("role_permissions")
          .insert(rolePermissions);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles-with-details"] });
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      toast.success("Permissões atualizadas!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar permissões: " + error.message);
    }
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles-with-details"] });
      toast.success("Role excluída!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir role: " + error.message);
    }
  });
}

export function useAuditLogs(filters?: {
  userId?: string;
  action?: string;
  resourceType?: string;
  severity?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters?.userId && filters.userId !== 'all') {
        query = query.eq("user_id", filters.userId);
      }
      if (filters?.action && filters.action !== 'all') {
        query = query.eq("action", filters.action);
      }
      if (filters?.resourceType && filters.resourceType !== 'all') {
        query = query.eq("resource_type", filters.resourceType);
      }
      if (filters?.severity && filters.severity !== 'all') {
        query = query.eq("severity", filters.severity);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!user
  });
}

export function useUserPermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.role_id) return [];

      const { data, error } = await supabase
        .from("role_permissions")
        .select("permissions(*)")
        .eq("role_id", profile.role_id);

      if (error) throw error;

      return data.map(rp => rp.permissions).filter(Boolean) as Permission[];
    },
    enabled: !!user
  });
}
