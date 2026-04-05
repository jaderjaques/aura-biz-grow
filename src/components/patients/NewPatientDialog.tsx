import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Patient, Insurance } from "@/types/patients";

interface NewPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Patient>) => Promise<any>;
  insurances: Insurance[];
}

const INITIAL_FORM = {
  full_name: "",
  cpf: "",
  birth_date: "",
  gender: "" as Patient["gender"] | "",
  phone: "",
  email: "",
  whatsapp: "",
  preferred_contact: "whatsapp" as Patient["preferred_contact"],
  source: "direct",
  referred_by_name: "",
  instagram: "",
  has_insurance: false,
  insurance_id: "",
  insurance_card_number: "",
  insurance_validity: "",
  address_street: "",
  address_number: "",
  address_complement: "",
  address_neighborhood: "",
  address_city: "",
  address_state: "",
  address_zip: "",
  responsible_name: "",
  responsible_phone: "",
  responsible_relationship: "",
  notes: "",
  status: "active" as Patient["status"],
};

export function NewPatientDialog({
  open,
  onOpenChange,
  onSave,
  insurances,
}: NewPatientDialogProps) {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.full_name || !form.phone) return;
    setSaving(true);
    try {
      const payload: Partial<Patient> = {
        full_name: form.full_name,
        cpf: form.cpf || null,
        birth_date: form.birth_date || null,
        gender: (form.gender as Patient["gender"]) || null,
        phone: form.phone,
        email: form.email || null,
        whatsapp: form.whatsapp || form.phone,
        preferred_contact: form.preferred_contact,
        source: form.source,
        referred_by_name: form.referred_by_name || null,
        instagram: form.instagram || null,
        has_insurance: form.has_insurance,
        insurance_id: form.has_insurance && form.insurance_id ? form.insurance_id : null,
        insurance_card_number: form.has_insurance ? form.insurance_card_number || null : null,
        insurance_validity: form.has_insurance && form.insurance_validity ? form.insurance_validity : null,
        address_street: form.address_street || null,
        address_number: form.address_number || null,
        address_complement: form.address_complement || null,
        address_neighborhood: form.address_neighborhood || null,
        address_city: form.address_city || null,
        address_state: form.address_state || null,
        address_zip: form.address_zip || null,
        responsible_name: form.responsible_name || null,
        responsible_phone: form.responsible_phone || null,
        responsible_relationship: form.responsible_relationship || null,
        notes: form.notes || null,
        status: form.status,
      };
      await onSave(payload);
      setForm({ ...INITIAL_FORM });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Paciente</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="pessoal">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pessoal">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="endereco">Endereço</TabsTrigger>
            <TabsTrigger value="outros">Convênio / Obs.</TabsTrigger>
          </TabsList>

          {/* DADOS PESSOAIS */}
          <TabsContent value="pessoal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Nome Completo *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  placeholder="Nome do paciente"
                />
              </div>

              <div className="space-y-1">
                <Label>CPF</Label>
                <Input
                  value={form.cpf}
                  onChange={(e) => set("cpf", e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="space-y-1">
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => set("birth_date", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Gênero</Label>
                <Select value={form.gender || ""} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="O">Outro</SelectItem>
                    <SelectItem value="N">Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Telefone / WhatsApp *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(31) 99999-9999"
                />
              </div>

              <div className="space-y-1">
                <Label>WhatsApp (se diferente)</Label>
                <Input
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  placeholder="(31) 99999-9999"
                />
              </div>

              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-1">
                <Label>Instagram</Label>
                <Input
                  value={form.instagram}
                  onChange={(e) => set("instagram", e.target.value)}
                  placeholder="@usuario"
                />
              </div>

              <div className="space-y-1">
                <Label>Contato Preferido</Label>
                <Select value={form.preferred_contact} onValueChange={(v) => set("preferred_contact", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Como nos conheceu</Label>
                <Select value={form.source} onValueChange={(v) => set("source", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direto</SelectItem>
                    <SelectItem value="referral">Indicação</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.source === "referral" && (
                <div className="space-y-1">
                  <Label>Indicado por</Label>
                  <Input
                    value={form.referred_by_name}
                    onChange={(e) => set("referred_by_name", e.target.value)}
                    placeholder="Nome de quem indicou"
                  />
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Responsável (para menores)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome do Responsável</Label>
                  <Input
                    value={form.responsible_name}
                    onChange={(e) => set("responsible_name", e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Telefone do Responsável</Label>
                  <Input
                    value={form.responsible_phone}
                    onChange={(e) => set("responsible_phone", e.target.value)}
                    placeholder="(31) 99999-9999"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Parentesco</Label>
                  <Input
                    value={form.responsible_relationship}
                    onChange={(e) => set("responsible_relationship", e.target.value)}
                    placeholder="Pai, mãe, tutor..."
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ENDEREÇO */}
          <TabsContent value="endereco" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Rua / Logradouro</Label>
                <Input
                  value={form.address_street}
                  onChange={(e) => set("address_street", e.target.value)}
                  placeholder="Rua das Flores"
                />
              </div>
              <div className="space-y-1">
                <Label>Número</Label>
                <Input
                  value={form.address_number}
                  onChange={(e) => set("address_number", e.target.value)}
                  placeholder="123"
                />
              </div>
              <div className="space-y-1">
                <Label>Complemento</Label>
                <Input
                  value={form.address_complement}
                  onChange={(e) => set("address_complement", e.target.value)}
                  placeholder="Apto 2"
                />
              </div>
              <div className="space-y-1">
                <Label>Bairro</Label>
                <Input
                  value={form.address_neighborhood}
                  onChange={(e) => set("address_neighborhood", e.target.value)}
                  placeholder="Centro"
                />
              </div>
              <div className="space-y-1">
                <Label>CEP</Label>
                <Input
                  value={form.address_zip}
                  onChange={(e) => set("address_zip", e.target.value)}
                  placeholder="30000-000"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Cidade</Label>
                <Input
                  value={form.address_city}
                  onChange={(e) => set("address_city", e.target.value)}
                  placeholder="Belo Horizonte"
                />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Input
                  value={form.address_state}
                  onChange={(e) => set("address_state", e.target.value)}
                  placeholder="MG"
                  maxLength={2}
                />
              </div>
            </div>
          </TabsContent>

          {/* CONVÊNIO / OBSERVAÇÕES */}
          <TabsContent value="outros" className="space-y-4 mt-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.has_insurance}
                onCheckedChange={(v) => set("has_insurance", v)}
              />
              <Label className="text-sm">Paciente possui convênio</Label>
            </div>

            {form.has_insurance && (
              <div className="grid grid-cols-2 gap-4 pl-1">
                <div className="space-y-1">
                  <Label>Convênio</Label>
                  <Select value={form.insurance_id} onValueChange={(v) => set("insurance_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o convênio" /></SelectTrigger>
                    <SelectContent>
                      {insurances.map((ins) => (
                        <SelectItem key={ins.id} value={ins.id}>{ins.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Número da Carteirinha</Label>
                  <Input
                    value={form.insurance_card_number}
                    onChange={(e) => set("insurance_card_number", e.target.value)}
                    placeholder="0000000000"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Validade</Label>
                  <Input
                    type="date"
                    value={form.insurance_validity}
                    onChange={(e) => set("insurance_validity", e.target.value)}
                  />
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Anotações sobre o paciente..."
                rows={4}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.full_name || !form.phone}>
            {saving ? "Salvando..." : "Cadastrar Paciente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
