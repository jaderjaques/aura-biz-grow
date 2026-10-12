import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, MessageCircle, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentProfile } from "@/lib/tenant-utils";
import { isValidEmail, isValidPhone } from "@/lib/documents";
import { useConfirm } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// A tabela contacts ainda não está em types.ts.
const db = supabase as any;

const ROLES: Record<string, string> = {
  decisor: "Decisor",
  influenciador: "Influenciador",
  usuario: "Usuário",
  barreira: "Barreira",
};

interface Contact {
  id: string;
  nome: string;
  cargo: string | null;
  setor: string | null;
  nota: string | null;
  principal: boolean;
  email: string | null;
  phone: string | null;
  papel: string | null;
}

const empty = { nome: "", cargo: "", setor: "", nota: "", email: "", phone: "", papel: "none", principal: false };

// Contatos adicionais de um lead ou cliente (sócios, financeiro, etc.).
// O contato do próprio cadastro continua valendo como principal, a menos que outro seja marcado.
export function ContactsSection({ leadId, customerId }: { leadId?: string; customerId?: string }) {
  const qc = useQueryClient();
  const [confirm, confirmDialog] = useConfirm();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const column = customerId ? "customer_id" : "lead_id";
  const ownerId = customerId ?? leadId;
  const key = ["contacts", column, ownerId];

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: key,
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await db
        .from("contacts")
        .select("id, nome, cargo, setor, nota, principal, email, phone, papel")
        .eq(column, ownerId)
        .order("principal", { ascending: false })
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const set = (k: keyof typeof empty, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => { setForm(empty); setEditing("new"); };
  const openEdit = (c: Contact) => {
    setForm({
      nome: c.nome, cargo: c.cargo ?? "", setor: c.setor ?? "", nota: c.nota ?? "", email: c.email ?? "",
      phone: c.phone ?? "", papel: c.papel ?? "none", principal: c.principal,
    });
    setEditing(c.id);
  };

  async function save() {
    if (!form.nome.trim()) return toast.error("Informe o nome do contato");
    if (!form.phone.trim() && !form.email.trim()) return toast.error("Informe telefone ou e-mail");
    if (form.phone.trim() && !isValidPhone(form.phone)) return toast.error("Telefone inválido", { description: "Use DDD + número." });
    if (form.email.trim() && !isValidEmail(form.email)) return toast.error("E-mail inválido");
    setSaving(true);
    try {
      const row = {
        nome: form.nome.trim(),
        cargo: form.cargo.trim() || null,
        setor: form.setor.trim() || null,
        nota: form.nota.trim() || null,
        email: form.email.trim().toLowerCase() || null,
        phone: form.phone.trim() || null,
        papel: form.papel === "none" ? null : form.papel,
        principal: form.principal,
      };
      if (editing === "new") {
        const profile = await getCurrentProfile();
        const { error } = await db.from("contacts").insert({ ...row, tenant_id: profile.tenant_id, [column]: ownerId });
        if (error) throw error;
      } else {
        const { error } = await db.from("contacts").update(row).eq("id", editing);
        if (error) throw error;
      }
      toast.success("Contato salvo");
      setEditing(null);
      qc.invalidateQueries({ queryKey: key });
    } catch (e: any) {
      // índice único: o mesmo telefone não pode estar em dois cadastros
      const dup = e?.code === "23505";
      toast.error(dup ? "Este telefone já pertence a outro contato" : "Não foi possível salvar", { description: dup ? undefined : e?.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Contact) {
    if (!(await confirm({ title: `Remover ${c.nome}?`, description: "O contato sai deste cadastro.", destructive: true, confirmLabel: "Remover" }))) return;
    const { error } = await db.from("contacts").delete().eq("id", c.id);
    if (error) return toast.error("Não foi possível remover", { description: error.message });
    qc.invalidateQueries({ queryKey: key });
  }

  const wa = (p: string) => `https://wa.me/${p.replace(/\D/g, "").replace(/^(?!55)/, "55")}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Outros contatos</h4>
        <Button variant="outline" size="sm" className="h-8" onClick={openNew}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar
        </Button>
      </div>

      {contacts.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum contato adicional. Adicione sócios, financeiro ou quem mais decide.</p>
      )}
      <p className="text-xs text-muted-foreground">
        Pela Mavie, só quem tem o papel Decisor (e o contato do próprio cadastro) vê faturas, contratos e valores.
      </p>

      {contacts.map((c) => (
        <div key={c.id} className="rounded-md border p-3 space-y-1.5 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="font-medium break-words">{c.nome}</span>
              {c.principal && <Badge>Principal</Badge>}
              {c.papel && <Badge variant="secondary">{ROLES[c.papel] ?? c.papel}</Badge>}
              {c.cargo && <Badge variant="outline">{c.cargo}</Badge>}
              {c.setor && <Badge variant="outline">{c.setor}</Badge>}
            </div>
            <div className="flex shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Editar contato" onClick={() => openEdit(c)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Remover contato" onClick={() => remove(c)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {c.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{c.phone}</span>
              <a href={wa(c.phone)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            </div>
          )}
          {c.email && (
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`mailto:${c.email}`} className="text-primary hover:underline break-all">{c.email}</a>
            </div>
          )}
          {c.nota && <p className="text-muted-foreground whitespace-pre-wrap">{c.nota}</p>}
        </div>
      ))}

      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Novo contato" : "Editar contato"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} maxLength={120} autoFocus />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(31) 99999-9999" inputMode="tel" />
              </div>
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input value={form.email} onChange={(e) => set("email", e.target.value)} inputMode="email" />
              </div>
              <div className="space-y-1">
                <Label>Cargo</Label>
                <Input value={form.cargo} onChange={(e) => set("cargo", e.target.value)} maxLength={80} placeholder="Sócio, gerente..." />
              </div>
              <div className="space-y-1">
                <Label>Setor</Label>
                <Input value={form.setor} onChange={(e) => set("setor", e.target.value)} maxLength={80} placeholder="Compras, TI..." />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Papel na decisão</Label>
              <Select value={form.papel} onValueChange={(v) => set("papel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não definido</SelectItem>
                  {Object.entries(ROLES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Decisor vê faturas e valores pela Mavie. Os demais recebem só o status geral.</p>
            </div>
            <div className="space-y-1">
              <Label>Nota</Label>
              <Textarea value={form.nota} onChange={(e) => set("nota", e.target.value)} maxLength={500} rows={2} placeholder="Ex.: assina o contrato, prefere áudio" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.principal} onCheckedChange={(v) => set("principal", v === true)} />
              Contato principal
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmDialog}
    </div>
  );
}
