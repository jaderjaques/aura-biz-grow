import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;   // subdomain (logical tenant key)
  tenantName: string;
}

const EMPTY = { fullName: "", email: "", phone: "" };

export function InviteTenantUserDialog({ open, onOpenChange, tenantId, tenantName }: Props) {
  const { profile } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.fullName.trim()) { toast.error("Informe o nome."); return; }
    if (!form.email.trim()) { toast.error("Informe o e-mail."); return; }

    setSaving(true);
    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", form.email)
        .maybeSingle();

      if (existing) {
        toast.error("Este e-mail já está cadastrado no sistema.");
        setSaving(false);
        return;
      }

      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Busca o role "Administrador" para definir como padrão do primeiro usuário
      const { data: roleData } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "Administrador")
        .single();

      const { error } = await supabase.from("profiles").insert({
        id: crypto.randomUUID(),
        full_name: form.fullName,
        email: form.email,
        phone: form.phone || null,
        tenant_id: tenantId,
        role_id: roleData?.id ?? null,
        role: "admin",
        invited_by: profile?.id,
        invite_token: inviteToken,
        invite_sent_at: new Date().toISOString(),
        invite_expires_at: expiresAt.toISOString(),
        status: "pending",
        is_active: false,
      });

      if (error) throw error;

      const link = `${window.location.origin}/aceitar-convite?token=${inviteToken}`;
      setInviteLink(link);
      toast.success("Convite criado com sucesso!");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar convite.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setForm(EMPTY);
    setInviteLink(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar usuário
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Empresa: <strong>{tenantName}</strong>
          </p>
        </DialogHeader>

        {!inviteLink ? (
          <>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Nome completo *</Label>
                <Input
                  placeholder="Ex: João da Silva"
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  placeholder="joao@empresa.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Criando..." : "Gerar convite"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-4 space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-green-800">Convite criado!</p>
                <p className="text-sm text-green-700 mt-1">
                  Envie o link abaixo para <strong>{form.email}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Link de acesso</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inviteLink}
                    className="text-xs font-mono"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Válido por 7 dias. O usuário definirá a própria senha ao acessar o link.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleCopy} variant="outline">
                {copied ? <><Check className="h-4 w-4 mr-2" />Copiado!</> : <><Copy className="h-4 w-4 mr-2" />Copiar link</>}
              </Button>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
