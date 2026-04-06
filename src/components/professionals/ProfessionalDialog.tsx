import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus } from "lucide-react";
import {
  Professional, ProfessionalWithProfile,
  WorkingHours, DEFAULT_WORKING_HOURS, DAY_LABELS, DAYS_OF_WEEK,
} from "@/types/professionals";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional?: ProfessionalWithProfile | null;
  availableProfiles: { id: string; full_name: string; email: string }[];
  onSave: (data: Partial<Professional>) => Promise<any>;
}

const LICENSE_TYPES = ["CRO", "CRM", "CRF", "CREFITO", "CRP", "CRN", "Outro"];

const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function ProfessionalDialog({
  open, onOpenChange, professional, availableProfiles, onSave,
}: Props) {
  const isEdit = !!professional;

  const [profileId, setProfileId] = useState(professional?.profile_id ?? "");
  const [licenseType, setLicenseType] = useState(professional?.license_type ?? "CRO");
  const [licenseNumber, setLicenseNumber] = useState(professional?.license_number ?? "");
  const [licenseState, setLicenseState] = useState(professional?.license_state ?? "");
  const [specialties, setSpecialties] = useState<string[]>(professional?.specialties ?? []);
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [rooms, setRooms] = useState<string[]>(professional?.rooms ?? []);
  const [roomInput, setRoomInput] = useState("");
  const [duration, setDuration] = useState(professional?.default_appointment_duration ?? 60);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    (professional?.working_hours as WorkingHours) ?? DEFAULT_WORKING_HOURS
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (professional) {
      setProfileId(professional.profile_id ?? "");
      setLicenseType(professional.license_type ?? "CRO");
      setLicenseNumber(professional.license_number ?? "");
      setLicenseState(professional.license_state ?? "");
      setSpecialties(professional.specialties ?? []);
      setRooms(professional.rooms ?? []);
      setDuration(professional.default_appointment_duration ?? 60);
      setWorkingHours((professional.working_hours as WorkingHours) ?? DEFAULT_WORKING_HOURS);
    }
  }, [professional]);

  const addSpecialty = () => {
    const v = specialtyInput.trim();
    if (v && !specialties.includes(v)) {
      setSpecialties((prev) => [...prev, v]);
    }
    setSpecialtyInput("");
  };

  const addRoom = () => {
    const v = roomInput.trim();
    if (v && !rooms.includes(v)) {
      setRooms((prev) => [...prev, v]);
    }
    setRoomInput("");
  };

  const updateDay = (day: keyof WorkingHours, field: "active" | "start" | "end", value: any) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        profile_id: profileId || null,
        license_type: licenseType || null,
        license_number: licenseNumber || null,
        license_state: licenseState || null,
        specialties: specialties.length > 0 ? specialties : null,
        rooms: rooms.length > 0 ? rooms : null,
        default_appointment_duration: duration,
        working_hours: workingHours as any,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Profissional" : "Novo Profissional"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="horarios">Horários</TabsTrigger>
            <TabsTrigger value="consultorios">Consultórios</TabsTrigger>
          </TabsList>

          {/* ABA DADOS */}
          <TabsContent value="dados" className="space-y-4 mt-4">
            {/* Vincular a um perfil do sistema */}
            <div className="space-y-1">
              <Label>Usuário do sistema (opcional)</Label>
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário cadastrado..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Nenhum (profissional externo) —</SelectItem>
                  {availableProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name} — {p.email}
                    </SelectItem>
                  ))}
                  {isEdit && professional?.profile && (
                    <SelectItem value={professional.profile.id}>
                      {professional.profile.full_name} — {professional.profile.email}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Vincule a um usuário para que ele visualize sua própria agenda.
              </p>
            </div>

            <Separator />

            {/* Registro profissional */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Tipo de registro</Label>
                <Select value={licenseType} onValueChange={setLicenseType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LICENSE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Número</Label>
                <Input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="123456"
                />
              </div>
              <div className="space-y-1">
                <Label>UF</Label>
                <Select value={licenseState} onValueChange={setLicenseState}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {BR_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Especialidades */}
            <div className="space-y-2">
              <Label>Especialidades</Label>
              <div className="flex gap-2">
                <Input
                  value={specialtyInput}
                  onChange={(e) => setSpecialtyInput(e.target.value)}
                  placeholder="Ex: Ortodontia, Endodontia..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSpecialty())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addSpecialty}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {specialties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {specialties.map((s) => (
                    <Badge key={s} variant="secondary" className="gap-1">
                      {s}
                      <button onClick={() => setSpecialties((prev) => prev.filter((x) => x !== s))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Duração padrão */}
            <div className="space-y-1 max-w-[200px]">
              <Label>Duração padrão da consulta (min)</Label>
              <Input
                type="number"
                min={15}
                step={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
          </TabsContent>

          {/* ABA HORÁRIOS */}
          <TabsContent value="horarios" className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              Configure os dias e horários de atendimento deste profissional.
            </p>
            {DAYS_OF_WEEK.map((day) => {
              const schedule = workingHours[day];
              return (
                <div key={day} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <Switch
                    checked={schedule.active}
                    onCheckedChange={(v) => updateDay(day, "active", v)}
                  />
                  <span className={`w-36 text-sm ${schedule.active ? "" : "text-muted-foreground"}`}>
                    {DAY_LABELS[day]}
                  </span>
                  {schedule.active ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={schedule.start}
                        onChange={(e) => updateDay(day, "start", e.target.value)}
                        className="w-28 h-8 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">até</span>
                      <Input
                        type="time"
                        value={schedule.end}
                        onChange={(e) => updateDay(day, "end", e.target.value)}
                        className="w-28 h-8 text-sm"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Não atende</span>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* ABA CONSULTÓRIOS */}
          <TabsContent value="consultorios" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Informe os consultórios/salas em que este profissional atende.
              Serão usados como opções no agendamento.
            </p>
            <div className="flex gap-2">
              <Input
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="Ex: Consultório 1, Sala A..."
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRoom())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addRoom}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {rooms.length > 0 ? (
              <div className="space-y-2">
                {rooms.map((r, i) => (
                  <div key={r} className="flex items-center justify-between p-2 border rounded-lg">
                    <span className="text-sm">
                      <span className="text-muted-foreground mr-2">{i + 1}.</span>
                      {r}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setRooms((prev) => prev.filter((x) => x !== r))}
                    >
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-4">
                Nenhum consultório cadastrado ainda.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
