import { useState, useEffect } from "react";
import { UserPlus, MoreVertical, Mail, RefreshCw, Ban, CheckCircle, Edit, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InviteUserDialog } from "@/components/users/InviteUserDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: string | null;
  invite_sent_at: string | null;
  invite_expires_at: string | null;
  is_active: boolean | null;
  role: {
    id: string;
    name: string;
  } | null;
}

const getStatusBadge = (status: string | null, isActive: boolean | null) => {
  const variants: Record<string, { className: string; label: string }> = {
    active: {
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      label: "Ativo ✓",
    },
    pending: {
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
      label: "Convite Pendente ⏳",
    },
    suspended: {
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
      label: "Suspenso ⚠️",
    },
  };

  const variant = variants[status || "active"] || variants.active;
  return <Badge className={variant.className}>{variant.label}</Badge>;
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function Users() {
  const { profile: currentProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        phone,
        avatar_url,
        status,
        invite_sent_at,
        invite_expires_at,
        is_active,
        role:roles(id, name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    } else {
      setUsers(data as UserProfile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleResendInvite = async (user: UserProfile) => {
    const newToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error } = await supabase
      .from("profiles")
      .update({
        invite_token: newToken,
        invite_sent_at: new Date().toISOString(),
        invite_expires_at: expiresAt.toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Erro ao reenviar convite");
      console.error(error);
    } else {
      const inviteLink = `${window.location.origin}/aceitar-convite?token=${newToken}`;
      toast.success("Convite reenviado!", {
        description: `Link: ${inviteLink}`,
        duration: 10000,
      });
      fetchUsers();
    }
  };

  const handleCancelInvite = async (user: UserProfile) => {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id)
      .eq("status", "pending");

    if (error) {
      toast.error("Erro ao cancelar convite");
      console.error(error);
    } else {
      toast.success("Convite cancelado");
      fetchUsers();
    }
  };

  const handleSuspendUser = async (user: UserProfile) => {
    const { error } = await supabase
      .from("profiles")
      .update({ status: "suspended", is_active: false })
      .eq("id", user.id);

    if (error) {
      toast.error("Erro ao suspender usuário");
      console.error(error);
    } else {
      toast.success("Usuário suspenso");
      fetchUsers();
    }
  };

  const handleReactivateUser = async (user: UserProfile) => {
    const { error } = await supabase
      .from("profiles")
      .update({ status: "active", is_active: true })
      .eq("id", user.id);

    if (error) {
      toast.error("Erro ao reativar usuário");
      console.error(error);
    } else {
      toast.success("Usuário reativado");
      fetchUsers();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Usuários</h1>
            <p className="text-muted-foreground">Gerencie a equipe do CRM</p>
          </div>
          <Button
            className="gradient-cta hover:opacity-90 text-white"
            onClick={() => setIsInviteDialogOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Convidar Usuário
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
            <CardDescription>
              Lista de todos os usuários e convites pendentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Convidado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="gradient-bg text-primary-foreground text-xs">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.role?.name || "Sem cargo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user.status, user.is_active)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.invite_sent_at
                          ? format(new Date(user.invite_sent_at), "dd/MM/yyyy", {
                              locale: ptBR,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.id !== currentProfile?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {user.status === "pending" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleResendInvite(user)}
                                  >
                                    <Mail className="mr-2 h-4 w-4" />
                                    Reenviar Convite
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleCancelInvite(user)}
                                    className="text-destructive"
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Cancelar Convite
                                  </DropdownMenuItem>
                                </>
                              )}
                              {user.status === "active" && (
                                <DropdownMenuItem
                                  onClick={() => handleSuspendUser(user)}
                                  className="text-destructive"
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Suspender Acesso
                                </DropdownMenuItem>
                              )}
                              {user.status === "suspended" && (
                                <DropdownMenuItem
                                  onClick={() => handleReactivateUser(user)}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Reativar Acesso
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <InviteUserDialog
          open={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
          onSuccess={fetchUsers}
        />
      </div>
    </AppLayout>
  );
}
