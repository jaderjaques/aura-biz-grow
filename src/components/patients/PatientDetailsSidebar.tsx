import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  User, Phone, Mail, MapPin, Shield, Calendar,
  MessageCircle, Pencil, Save, X, Users, FileText, AlertTriangle, ClipboardList,
} from "lucide-react";
import { PatientWithDetails, PatientStatus, GENDER_LABELS, Insurance } from "@/types/patients";
import { MedicalRecordsTab } from "./MedicalRecordsTab";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PatientAnamnesisTab } from "./PatientAnamnesisTab";

interface PatientDetailsSidebarProps {
  patient: PatientWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: any) => Promise<void>;
  insurances: Insurance[];
  showOdontogram?: boolean;
}

export function PatientDetailsSidebar({
  patient,
  open,
  onOpenChange,
  onUpdate,
  insurances,
  showOdontogram = false,
}: PatientDetailsSidebarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  if (!patient) return null;

  const set = (field: string, value: any) =>
    setForm((prev: any) => ({ ...prev, [field]: value }));

  const startEditing = () => {
    setForm({
      full_name: patient.full_name,
      cpf: patient.cpf || "",
      birth_date: patient.birth_date || "",
      gender: patient.gender || "",
      phone: patient.phone,
      email: patient.email || "",
      whatsapp: patient.whatsapp || "",
      preferred_contact: patient.preferred_contact,
      source: patient.source,
      status: patient.status,
      has_insurance: patient.has_insurance,
      insurance_id: patient.insurance_id || "",
      insurance_card_number: patient.insurance_card_number || "",
      insurance_validity: patient.insurance_validity || "",
      address_street: patient.address_street || "",
      address_number: patient.address_number || "",
      address_city: patient.address_city || "",
      address_state: patient.address_state || "",
      address_zip: patient.address_zip || "",
      notes: patient.notes || "",
      allergies: patient.allergies || "",
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(patient.id, {
        ...form,
        gender: form.gender || null,
        birth_date: form.birth_date || null,
        insurance_id: form.has_insurance && form.insurance_id ? form.insurance_id : null,
        insurance_card_number: form.has_insurance ? form.insurance_card_number || null : null,
        insurance_validity: form.has_insurance && form.insurance_validity ? form.insurance_validity : null,
      });
      setIsEditing(false);
    } catch {
      // toast handled by hook
    } finally {
      setSaving(false);
    }
  };

  const calcAge = (birth_date: string | null) => {
    if (!birth_date) return null;
    return Math.floor(
      (Date.now() - new Date(birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
  };

  const getStatusBadge = (status: PatientStatus) => {
    const map: Record<PatientStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      active: { label: "Ativo", variant: "default" },
      inactive: { label: "Inativo", variant: "secondary" },
      blocked: { label: "Bloqueado", variant: "destructive" },
    };
    const cfg = map[status] || map.active;
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const whatsappLink = `https://wa.me/${(patient.whatsapp || patient.phone).replace(/\D/g, "")}`;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) setIsEditing(false); onOpenChange(o); }}>
      <SheetContent className="w-full sm:max-w-[680px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {getInitials(patient.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-xl">
                  {isEditing ? (
                    <Input
                      value={form.full_name}
                      onChange={(e) => set("full_name", e.target.value)}
                      className="text-lg font-semibold h-auto py-1"
                    />
                  ) : (
                    patient.full_name
                  )}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge((isEditing ? form.status : patient.status) as PatientStatus)}
                  {patient.birth_date && (
                    <span className="text-sm text-muted-foreground">
                      {calcAge(patient.birth_date)} anos
                    </span>
                  )}
                  {patient.gender && (
                    <span className="text-sm text-muted-foreground">
                      · {GENDER_LABELS[patient.gender]}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!isEditing && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-3.5 w-3.5 mr-1" />
                    WhatsApp
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Editar
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        {/* Alerta de ATENÇÃO — alergias */}
        {patient.allergies && (
          <Alert className="mt-4 border-destructive/50 bg-destructive/10 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              <span className="font-bold">ATENÇÃO:</span> {patient.allergies}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">
              <User className="h-4 w-4 mr-1" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="historico">
              <Calendar className="h-4 w-4 mr-1" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="prontuario">
              <FileText className="h-4 w-4 mr-1" />
              Prontuário
            </TabsTrigger>
            <TabsTrigger value="anamnese">
              <ClipboardList className="h-4 w-4 mr-1" />
              Anamnese
            </TabsTrigger>
          </TabsList>

          {/* ABA INFORMAÇÕES */}
          <TabsContent value="info" className="space-y-4 mt-4">

            {/* Convênio */}
            {isEditing ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={form.has_insurance}
                      onCheckedChange={(v) => set("has_insurance", v)}
                    />
                    <Label>Possui convênio</Label>
                  </div>
                  {form.has_insurance && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Convênio</Label>
                        <Select value={form.insurance_id} onValueChange={(v) => set("insurance_id", v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {insurances.map((ins) => (
                              <SelectItem key={ins.id} value={ins.id}>{ins.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Carteirinha</Label>
                        <Input value={form.insurance_card_number} onChange={(e) => set("insurance_card_number", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Validade</Label>
                        <Input type="date" value={form.insurance_validity} onChange={(e) => set("insurance_validity", e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
                <Separator />
              </>
            ) : patient.insurance ? (
              <>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-semibold text-sm">{patient.insurance.name}</p>
                        {patient.insurance_card_number && (
                          <p className="text-xs text-muted-foreground">Carteirinha: {patient.insurance_card_number}</p>
                        )}
                        {patient.insurance_validity && (
                          <p className="text-xs text-muted-foreground">
                            Validade: {format(new Date(patient.insurance_validity), "dd/MM/yyyy")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Separator />
              </>
            ) : null}

            {/* Contato */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Contato</h4>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">E-mail</Label>
                    <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status</Label>
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
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.phone}</span>
                  </div>
                  {patient.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${patient.email}`} className="text-primary hover:underline">
                        {patient.email}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Dados Pessoais */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Dados Pessoais</h4>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">CPF</Label>
                    <Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nascimento</Label>
                    <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Gênero</Label>
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
                </div>
              ) : (
                <div className="grid gap-2 text-sm">
                  {patient.cpf && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPF:</span>
                      <span>{patient.cpf}</span>
                    </div>
                  )}
                  {patient.birth_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nascimento:</span>
                      <span>
                        {format(new Date(patient.birth_date), "dd/MM/yyyy")} ({calcAge(patient.birth_date)} anos)
                      </span>
                    </div>
                  )}
                  {patient.gender && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gênero:</span>
                      <span>{GENDER_LABELS[patient.gender]}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Origem:</span>
                    <span className="capitalize">{patient.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cadastrado em:</span>
                    <span>{format(new Date(patient.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Endereço */}
            {!isEditing && (patient.address_street || patient.address_city) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Endereço
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {[patient.address_street, patient.address_number, patient.address_neighborhood,
                      patient.address_city, patient.address_state, patient.address_zip]
                      .filter(Boolean).join(", ")}
                  </p>
                </div>
              </>
            )}

            {/* Responsável */}
            {!isEditing && patient.responsible_name && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" /> Responsável
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>{patient.responsible_name} ({patient.responsible_relationship})</p>
                    {patient.responsible_phone && <p className="text-muted-foreground">{patient.responsible_phone}</p>}
                  </div>
                </div>
              </>
            )}

            {/* ATENÇÃO — Alergias */}
            {isEditing ? (
              <>
                <Separator />
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> ATENÇÃO (alergias, medicamentos, restrições)
                  </Label>
                  <Textarea
                    value={form.allergies}
                    onChange={(e) => set("allergies", e.target.value)}
                    rows={2}
                    placeholder="Ex: Alergia à penicilina, intolerante a látex..."
                    className="border-destructive/50 focus-visible:ring-destructive/50"
                  />
                </div>
              </>
            ) : patient.allergies ? (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> ATENÇÃO
                  </h4>
                  <p className="text-sm">{patient.allergies}</p>
                </div>
              </>
            ) : null}

            {/* Observações */}
            {isEditing ? (
              <>
                <Separator />
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Observações</Label>
                  <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
                </div>
              </>
            ) : patient.notes ? (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Observações</h4>
                  <p className="text-sm text-muted-foreground">{patient.notes}</p>
                </div>
              </>
            ) : null}

            {/* Footer de edição */}
            {isEditing && (
              <>
                <Separator />
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                    <X className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* ABA HISTÓRICO */}
          <TabsContent value="historico" className="mt-4 space-y-4">
            {/* Métricas rápidas */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-bold">{patient.total_appointments ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Consultas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-bold">{patient.completed_appointments ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Realizadas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{patient.no_shows ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Faltas</p>
                </CardContent>
              </Card>
            </div>

            {patient.last_appointment && (
              <div className="text-sm">
                <span className="text-muted-foreground">Última consulta: </span>
                <span>{format(new Date(patient.last_appointment), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
            )}
            {patient.next_appointment && (
              <div className="text-sm">
                <span className="text-muted-foreground">Próxima consulta: </span>
                <span className="font-medium text-primary">
                  {format(new Date(patient.next_appointment), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}

            {!patient.total_appointments && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma consulta registrada ainda.
              </div>
            )}
          </TabsContent>

          {/* ABA PRONTUÁRIO */}
          <TabsContent value="anamnese" className="mt-4">
            <PatientAnamnesisTab patientId={patient.id} />
          </TabsContent>

          <TabsContent value="prontuario" className="mt-4">
            <MedicalRecordsTab
              patientId={patient.id}
              showOdontogram={showOdontogram}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
