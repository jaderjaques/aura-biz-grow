import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAdminTenants, CreateTenantInput } from "@/hooks/useSuperAdmin";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const EMPTY: CreateTenantInput = {
  name: "",
  subdomain: "",
  module: "agency",
  plan_tier: "",
  monthly_price: null,
  email: "",
  whatsapp_number: "",
  business_segment: "",
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CreateTenantDialog({ open, onOpenChange }: Props) {
  const { createTenant } = useAdminTenants();
  const [form, setForm] = useState<CreateTenantInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [subdomainEdited, setSubdomainEdited] = useState(false);

  const set = (field: keyof CreateTenantInput, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleNameChange = (name: string) => {
    set("name", name);
    if (!subdomainEdited) {
      set("subdomain", slugify(name));
    }
  };

  const handleSubdomainChange = (v: string) => {
    setSubdomainEdited(true);
    set("subdomain", v.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Informe o nome da empresa."); return; }
    if (!form.subdomain.trim()) { toast.error("Informe o subdomínio."); return; }
    if (!form.module) { toast.error("Selecione o módulo."); return; }

    setSaving(true);
    try {
      await createTenant(form);
      toast.success(`Empresa "${form.name}" criada com sucesso!`);
      setForm(EMPTY);
      setSubdomainEdited(false);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar empresa.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm(EMPTY);
    setSubdomainEdited(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Empresa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Identificação */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Nome da empresa *</Label>
              <Input
                placeholder="Ex: Clínica Sorriso Perfeito"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Subdomínio (ID único) *</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="clinica-sorriso"
                  value={form.subdomain}
                  onChange={(e) => handleSubdomainChange(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Apenas letras minúsculas, números e hífens. Usado como identificador único do tenant.
              </p>
            </div>
          </div>

          <Separator />

          {/* Plano */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Módulo *</Label>
              <Select value={form.module} onValueChange={(v) => set("module", v)}>
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
                placeholder="0,00"
                value={form.monthly_price ?? ""}
                onChange={(e) => set("monthly_price", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="space-y-1">
              <Label>Segmento</Label>
              <Input
                placeholder="Ex: Odontologia"
                value={form.business_segment ?? ""}
                onChange={(e) => set("business_segment", e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Contato */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>E-mail de contato</Label>
              <Input
                type="email"
                placeholder="contato@empresa.com"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>WhatsApp</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={form.whatsapp_number ?? ""}
                onChange={(e) => set("whatsapp_number", e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Criando..." : "Criar empresa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
