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

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const EDUCATION_LEVELS = [
  "Fundamental (Incompleto)", "Fundamental (Completo)",
  "Ensino Médio", "Graduado (Bacharel)", "Graduado (Licenciatura)",
  "Pós-Graduado", "Mestrado", "Doutorado", "Outro",
];

const INITIAL_FORM = {
  full_name: "",
  social_name: "",
  nickname: "",
  cpf: "",
  birth_date: "",
  gender: "" as Patient["gender"] | "",
  blood_type: "",
  education_level: "",
  prontuario_number: "",
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
  // Fiscal
  fiscal_same_as_patient: true,
  fiscal_document_type: "cpf" as "cpf" | "cnpj",
  fiscal_name: "",
  fiscal_document: "",
  fiscal_email: "",
  fiscal_phone: "",
  fiscal_company_name: "",
  fiscal_ie: "",
  fiscal_im: "",
  fiscal_address_street: "",
  fiscal_address_number: "",
  fiscal_address_complement: "",
  fiscal_address_neighborhood: "",
  fiscal_address_city: "",
  fiscal_address_state: "",
  fiscal_address_zip: "",
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
        social_name: form.social_name || null,
        nickname: form.nickname || null,
        prontuario_number: form.prontuario_number || null,
        cpf: form.cpf || null,
        birth_date: form.birth_date || null,
        gender: (form.gender as Patient["gender"]) || null,
        blood_type: form.blood_type || null,
        education_level: form.education_level || null,
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
      const fiscalPayload = form.fiscal_same_as_patient ? {
        fiscal_same_as_patient: true,
      } : {
        fiscal_same_as_patient: false,
        fiscal_document_type: form.fiscal_document_type,
        fiscal_name: form.fiscal_name || null,
        fiscal_document: form.fiscal_document || null,
        fiscal_email: form.fiscal_email || null,
        fiscal_phone: form.fiscal_phone || null,
        fiscal_company_name: form.fiscal_company_name || null,
        fiscal_ie: form.fiscal_ie || null,
        fiscal_im: form.fiscal_im || null,
        fiscal_address_street: form.fiscal_address_street || null,
        fiscal_address_number: form.fiscal_address_number || null,
        fiscal_address_complement: form.fiscal_address_complement || null,
        fiscal_address_neighborhood: form.fiscal_address_neighborhood || null,
        fiscal_address_city: form.fiscal_address_city || null,
        fiscal_address_state: form.fiscal_address_state || null,
        fiscal_address_zip: form.fiscal_address_zip || null,
      };
      await onSave({ ...payload, ...fiscalPayload });
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pessoal">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="endereco">Endereço</TabsTrigger>
            <TabsTrigger value="outros">Convênio / Obs.</TabsTrigger>
            <TabsTrigger value="fiscal">Dados Fiscais</TabsTrigger>
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
                <Label>Nome Social</Label>
                <Input
                  value={form.social_name}
                  onChange={(e) => set("social_name", e.target.value)}
                  placeholder="Como prefere ser chamado(a)"
                />
              </div>

              <div className="space-y-1">
                <Label>Apelido</Label>
                <Input
                  value={form.nickname}
                  onChange={(e) => set("nickname", e.target.value)}
                  placeholder="Apelido"
                />
              </div>

              <div className="space-y-1">
                <Label>Nº Prontuário</Label>
                <Input
                  value={form.prontuario_number}
                  onChange={(e) => set("prontuario_number", e.target.value)}
                  placeholder="Ex: 1042"
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
                <Label>Tipo Sanguíneo</Label>
                <Select value={form.blood_type || ""} onValueChange={(v) => set("blood_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {BLOOD_TYPES.map((bt) => (
                      <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Escolaridade</Label>
                <Select value={form.education_level || ""} onValueChange={(v) => set("education_level", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((el) => (
                      <SelectItem key={el} value={el}>{el}</SelectItem>
                    ))}
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

          {/* DADOS FISCAIS */}
          <TabsContent value="fiscal" className="space-y-4 mt-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.fiscal_same_as_patient}
                onCheckedChange={(v) => set("fiscal_same_as_patient", v)}
              />
              <Label className="text-sm">NF no nome do próprio paciente</Label>
            </div>

            {!form.fiscal_same_as_patient && (
              <div className="space-y-4">
                <Separator />

                {/* Tipo de documento */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Tipo de Documento</Label>
                    <Select value={form.fiscal_document_type} onValueChange={(v) => set("fiscal_document_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF (Pessoa Física)</SelectItem>
                        <SelectItem value="cnpj">CNPJ (Pessoa Jurídica)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{form.fiscal_document_type === "cnpj" ? "CNPJ" : "CPF"}</Label>
                    <Input
                      value={form.fiscal_document}
                      onChange={(e) => set("fiscal_document", e.target.value)}
                      placeholder={form.fiscal_document_type === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                    />
                  </div>
                </div>

                {/* Nome / Razão Social */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>{form.fiscal_document_type === "cnpj" ? "Razão Social" : "Nome Completo"}</Label>
                    <Input
                      value={form.fiscal_name}
                      onChange={(e) => set("fiscal_name", e.target.value)}
                      placeholder={form.fiscal_document_type === "cnpj" ? "Empresa Ltda." : "Nome do responsável"}
                    />
                  </div>
                  {form.fiscal_document_type === "cnpj" && (
                    <div className="space-y-1">
                      <Label>Nome Fantasia</Label>
                      <Input
                        value={form.fiscal_company_name}
                        onChange={(e) => set("fiscal_company_name", e.target.value)}
                        placeholder="Nome fantasia"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label>E-mail para NF</Label>
                    <Input
                      type="email"
                      value={form.fiscal_email}
                      onChange={(e) => set("fiscal_email", e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Telefone</Label>
                    <Input
                      value={form.fiscal_phone}
                      onChange={(e) => set("fiscal_phone", e.target.value)}
                      placeholder="(31) 99999-9999"
                    />
                  </div>
                  {form.fiscal_document_type === "cnpj" && (
                    <>
                      <div className="space-y-1">
                        <Label>Inscrição Estadual (IE)</Label>
                        <Input
                          value={form.fiscal_ie}
                          onChange={(e) => set("fiscal_ie", e.target.value)}
                          placeholder="Isento ou número"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Inscrição Municipal (IM)</Label>
                        <Input
                          value={form.fiscal_im}
                          onChange={(e) => set("fiscal_im", e.target.value)}
                          placeholder="Número"
                        />
                      </div>
                    </>
                  )}
                </div>

                <Separator />

                {/* Endereço fiscal */}
                <p className="text-sm font-semibold text-muted-foreground">Endereço para NF</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1">
                    <Label>Rua / Logradouro</Label>
                    <Input value={form.fiscal_address_street} onChange={(e) => set("fiscal_address_street", e.target.value)} placeholder="Rua das Flores" />
                  </div>
                  <div className="space-y-1">
                    <Label>Número</Label>
                    <Input value={form.fiscal_address_number} onChange={(e) => set("fiscal_address_number", e.target.value)} placeholder="123" />
                  </div>
                  <div className="space-y-1">
                    <Label>Complemento</Label>
                    <Input value={form.fiscal_address_complement} onChange={(e) => set("fiscal_address_complement", e.target.value)} placeholder="Sala 2" />
                  </div>
                  <div className="space-y-1">
                    <Label>Bairro</Label>
                    <Input value={form.fiscal_address_neighborhood} onChange={(e) => set("fiscal_address_neighborhood", e.target.value)} placeholder="Centro" />
                  </div>
                  <div className="space-y-1">
                    <Label>CEP</Label>
                    <Input value={form.fiscal_address_zip} onChange={(e) => set("fiscal_address_zip", e.target.value)} placeholder="30000-000" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Cidade</Label>
                    <Input value={form.fiscal_address_city} onChange={(e) => set("fiscal_address_city", e.target.value)} placeholder="Belo Horizonte" />
                  </div>
                  <div className="space-y-1">
                    <Label>Estado</Label>
                    <Input value={form.fiscal_address_state} onChange={(e) => set("fiscal_address_state", e.target.value)} placeholder="MG" maxLength={2} />
                  </div>
                </div>
              </div>
            )}
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
