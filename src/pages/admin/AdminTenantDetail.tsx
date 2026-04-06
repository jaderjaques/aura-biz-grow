import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Save, Users, Shield, CheckCircle, XCircle,
} from "lucide-react";
import { useAdminTenants, useAdminUsers, TenantWithStats, AdminUser } from "@/hooks/useSuperAdmin";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminTenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenants, updateTenant, loading: tenantsLoading } = useAdminTenants();
  const { users, toggleUserActive } = useAdminUsers();

  const tenant = tenants.find((t) => t.id === id);
  const tenantUsers = users.filter((u) => u.tenant_id === tenant?.subdomain);

  const [form, setForm] = useState<Partial<TenantWithStats>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name,
        subdomain: tenant.subdomain,
        module: tenant.module,
        plan_tier: tenant.plan_tier ?? "",
        monthly_price: tenant.monthly_price ?? undefined,
        email: tenant.email ?? "",
        whatsapp_number: tenant.whatsapp_number ?? "",
        business_segment: tenant.business_segment ?? "",
        active: tenant.active,
      });
    }
  }, [tenant?.id]);

  const set = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateTenant(id, form);
      toast.success("Empresa atualizada!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (tenantsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Carregando...
        </div>
      </AdminLayout>
    );
  }

  if (!tenant) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Empresa não encontrada.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/empresas")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/empresas")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{tenant.name}</h1>
            <p className="text-muted-foreground text-sm">{tenant.subdomain}</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configurações */}
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Nome da empresa</Label>
                    <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Subdomínio (tenant ID)</Label>
                    <Input value={form.subdomain ?? ""} onChange={(e) => set("subdomain", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>E-mail de contato</Label>
                    <Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsapp_number ?? ""} onChange={(e) => set("whatsapp_number", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Segmento</Label>
                    <Input value={form.business_segment ?? ""} onChange={(e) => set("business_segment", e.target.value)} />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Módulo</Label>
                    <Select value={form.module ?? "agency"} onValueChange={(v) => set("module", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agency">Agência</SelectItem>
                        <SelectItem value="clinic_dental">Clínica Odontológica</SelectItem>
                        <SelectItem value="clinic_aesthetics">Clínica Estética</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Plano</Label>
                    <Select value={form.plan_tier ?? ""} onValueChange={(v) => set("plan_tier", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Mensalidade (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.monthly_price ?? ""}
                      onChange={(e) => set("monthly_price", Number(e.target.value) || null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="block mb-2">Status</Label>
                    <div className="flex items-center gap-2">
                      <Switch checked={form.active ?? true} onCheckedChange={(v) => set("active", v)} />
                      <span className="text-sm">{form.active ? "Ativa" : "Inativa"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usuários da empresa */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Usuários ({tenantUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {tenantUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum usuário nesta empresa.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Ativo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenantUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.full_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                          <TableCell>
                            {u.is_super_admin ? (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <Shield className="h-3 w-3" />
                                Super Admin
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">{u.role ?? "—"}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={u.is_active}
                              onCheckedChange={(v) => toggleUserActive(u.id, v)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar de stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={tenant.active ? "default" : "secondary"}>
                    {tenant.active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Módulo</span>
                  <span className="font-medium capitalize">{tenant.module ?? "agency"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plano</span>
                  <span>{tenant.plan_tier ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mensalidade</span>
                  <span className="font-semibold">
                    {tenant.monthly_price
                      ? tenant.monthly_price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usuários</span>
                  <span>{tenant.user_count ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criada em</span>
                  <span>{format(new Date(tenant.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
