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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Save, Trash2, UserPlus } from "lucide-react";
import { useAdminTenants, TenantWithStats } from "@/hooks/useSuperAdmin";
import { InviteTenantUserDialog } from "@/components/admin/InviteTenantUserDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminTenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenants, updateTenant, deleteTenant, loading: tenantsLoading } = useAdminTenants();

  const tenant = tenants.find((t) => t.id === id);

  const [form, setForm] = useState<Partial<TenantWithStats>>({});
  const [saving, setSaving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

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
      toast.success("Empresa atualizada com sucesso!");
    } catch {
      toast.error("Erro ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteTenant(id);
      toast.success("Empresa removida.");
      navigate("/admin/empresas");
    } catch {
      toast.error("Erro ao remover empresa.");
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
            <p className="text-muted-foreground text-sm font-mono">{tenant.subdomain}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar usuário
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover empresa?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. A empresa <strong>{tenant.name}</strong> e todas as suas configurações serão removidas permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={handleDelete}
                  >
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configurações */}
          <div className="lg:col-span-2 space-y-5">
            {/* Dados da empresa */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados da Empresa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <Label>Nome da empresa</Label>
                    <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Subdomínio (ID do tenant)</Label>
                    <Input
                      value={form.subdomain ?? ""}
                      onChange={(e) => set("subdomain", e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Identificador único. Altere com cuidado.</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Segmento</Label>
                    <Input value={form.business_segment ?? ""} onChange={(e) => set("business_segment", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>E-mail de contato</Label>
                    <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsapp_number ?? ""} onChange={(e) => set("whatsapp_number", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contrato / Plano */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contrato & Acesso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <Label className="block mb-2">Status do contrato</Label>
                    <div className="flex items-center gap-3">
                      <Switch checked={form.active ?? true} onCheckedChange={(v) => set("active", v)} />
                      <div>
                        <span className="text-sm font-medium">{form.active ? "Ativa" : "Inativa"}</span>
                        {!form.active && (
                          <p className="text-xs text-muted-foreground">Acesso bloqueado para os usuários desta empresa</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar de resumo */}
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
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Módulo</span>
                  <span className="font-medium capitalize">{tenant.module ?? "agency"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plano</span>
                  <span className="capitalize">{tenant.plan_tier ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mensalidade</span>
                  <span className="font-semibold text-green-600">
                    {tenant.monthly_price
                      ? tenant.monthly_price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : "—"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usuários ativos</span>
                  <span>{tenant.user_count ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cadastrada em</span>
                  <span>{format(new Date(tenant.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4 pb-4 text-xs text-amber-800 space-y-1">
                <p className="font-semibold">⚠️ Bloquear acesso</p>
                <p>Desativar o status do contrato impede que todos os usuários desta empresa façam login no sistema.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <InviteTenantUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        tenantId={tenant.subdomain}
        tenantName={tenant.name}
      />
    </AdminLayout>
  );
}
