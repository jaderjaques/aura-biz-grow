import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Shield, Users } from "lucide-react";
import { useAdminUsers, useAdminTenants } from "@/hooks/useSuperAdmin";
import { useConfirm } from "@/hooks/useConfirm";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminUsers() {
  const { users, loading, toggleUserActive, toggleSuperAdmin } = useAdminUsers();
  const { tenants } = useAdminTenants();
  const [confirm, confirmDialog] = useConfirm();

  // as duas trocas mudam o acesso de uma pessoa: pedem confirmação e avisam se o banco recusar
  async function changeSuperAdmin(u: { id: string; full_name: string | null; email: string | null }, value: boolean) {
    const ok = await confirm({
      title: value ? `Tornar ${u.full_name || u.email} super admin?` : `Remover o acesso de super admin de ${u.full_name || u.email}?`,
      description: value ? "Super admin enxerga e altera os dados de TODAS as empresas." : "Ele volta a ver só a própria empresa.",
      confirmLabel: value ? "Sim, tornar super admin" : "Sim, remover",
      destructive: true,
    });
    if (!ok) return;
    try { await toggleSuperAdmin(u.id, value); toast.success("Acesso atualizado"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível alterar o acesso"); }
  }

  async function changeActive(u: { id: string; full_name: string | null; email: string | null }, value: boolean) {
    if (!value) {
      const ok = await confirm({
        title: `Desativar ${u.full_name || u.email}?`,
        description: "A pessoa deixa de conseguir entrar no sistema.",
        confirmLabel: "Sim, desativar",
        destructive: true,
      });
      if (!ok) return;
    }
    try { await toggleUserActive(u.id, value); toast.success(value ? "Usuário ativado" : "Usuário desativado"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível alterar o usuário"); }
  }
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const tenantFilter = searchParams.get("tenant") ?? "all";

  const setTenantFilter = (v: string) => {
    if (v === "all") searchParams.delete("tenant");
    else searchParams.set("tenant", v);
    setSearchParams(searchParams);
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchTenant =
      tenantFilter === "all" || u.tenant_id === tenantFilter;
    return matchSearch && matchTenant;
  });

  const totalActive = users.filter((u) => u.is_active).length;
  const totalSuperAdmin = users.filter((u) => u.is_super_admin).length;

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground text-sm">
            {users.length} usuário{users.length !== 1 ? "s" : ""} no total
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total", value: users.length, color: "text-foreground" },
            { label: "Ativos", value: totalActive, color: "text-green-600" },
            { label: "Inativos", value: users.length - totalActive, color: "text-red-500" },
            { label: "Super Admins", value: totalSuperAdmin, color: "text-amber-600" },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="pt-4 pb-4">
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="pl-9"
            />
          </div>
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.subdomain} value={t.subdomain}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Perfil / Cargo</TableHead>
                  <TableHead>Super Admin</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs bg-muted">
                            {getInitials(u.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{u.full_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{u.tenant_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.tenant_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.is_super_admin ? (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <Shield className="h-3 w-3" />
                          Super Admin
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">{u.role ?? "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={u.is_super_admin}
                        onCheckedChange={(v) => changeSuperAdmin(u, v)}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.created_at
                        ? format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={u.is_active}
                        onCheckedChange={(v) => changeActive(u, v)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      {confirmDialog}
    </AdminLayout>
  );
}
