import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, UserCheck, UserX, Clock } from "lucide-react";
import { useProfessionals } from "@/hooks/useProfessionals";
import { ProfessionalDialog } from "@/components/professionals/ProfessionalDialog";
import { ProfessionalWithProfile } from "@/types/professionals";

export default function Profissionais() {
  const {
    professionals, loading,
    createProfessional, updateProfessional, toggleActive,
    fetchUnlinkedProfiles,
  } = useProfessionals();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProfessionalWithProfile | null>(null);
  const [unlinkedProfiles, setUnlinkedProfiles] = useState<
    { id: string; full_name: string; email: string }[]
  >([]);

  const openNew = async () => {
    setEditing(null);
    const profiles = await fetchUnlinkedProfiles();
    setUnlinkedProfiles(profiles);
    setDialogOpen(true);
  };

  const openEdit = async (prof: ProfessionalWithProfile) => {
    setEditing(prof);
    const profiles = await fetchUnlinkedProfiles();
    setUnlinkedProfiles(profiles);
    setDialogOpen(true);
  };

  const handleSave = async (data: any) => {
    if (editing) {
      await updateProfessional(editing.id, data);
    } else {
      await createProfessional(data);
    }
  };

  const getInitials = (name?: string | null) =>
    (name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const formatScheduleSummary = (prof: ProfessionalWithProfile) => {
    const wh = prof.working_hours as any;
    if (!wh) return "Sem horário";
    const activeDays = Object.values(wh as Record<string, { active: boolean }>).filter(
      (d) => d.active
    ).length;
    return `${activeDays} dias/semana`;
  };

  const active = professionals.filter((p) => p.active);
  const inactive = professionals.filter((p) => !p.active);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Profissionais</h1>
            <p className="text-sm text-muted-foreground">
              {active.length} ativo{active.length !== 1 ? "s" : ""}
              {inactive.length > 0 && ` · ${inactive.length} inativo${inactive.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Profissional
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold">{professionals.length}</p>
              <p className="text-xs text-muted-foreground">Total cadastrado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-green-600">{active.length}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold">
                {professionals.filter((p) => (p.rooms?.length ?? 0) > 0).length}
              </p>
              <p className="text-xs text-muted-foreground">Com consultório</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold">
                {professionals.filter((p) => p.profile_id).length}
              </p>
              <p className="text-xs text-muted-foreground">Com acesso ao sistema</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : professionals.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum profissional cadastrado</p>
            <p className="text-sm mt-1">Clique em "Novo Profissional" para começar.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {professionals.map((prof) => (
              <Card
                key={prof.id}
                className={`transition-opacity ${prof.active ? "" : "opacity-60"}`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarImage src={prof.profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(prof.profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">
                          {prof.profile?.full_name ?? "Profissional externo"}
                        </p>
                        {!prof.active && (
                          <Badge variant="secondary" className="text-xs">Inativo</Badge>
                        )}
                        {prof.profile_id && (
                          <Badge variant="outline" className="text-xs">Acesso ao sistema</Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {/* Registro */}
                        {prof.license_number && (
                          <span>
                            {prof.license_type} {prof.license_number}
                            {prof.license_state && `/${prof.license_state}`}
                          </span>
                        )}
                        {/* Duração padrão */}
                        {prof.default_appointment_duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {prof.default_appointment_duration} min
                          </span>
                        )}
                        {/* Horários */}
                        <span>{formatScheduleSummary(prof)}</span>
                        {/* Consultórios */}
                        {prof.rooms && prof.rooms.length > 0 && (
                          <span>{prof.rooms.length} consultório{prof.rooms.length !== 1 ? "s" : ""}</span>
                        )}
                      </div>

                      {/* Especialidades */}
                      {prof.specialties && prof.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {prof.specialties.map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs font-normal">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={prof.active}
                        onCheckedChange={(v) => toggleActive(prof.id, v)}
                        title={prof.active ? "Desativar" : "Ativar"}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(prof)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleActive(prof.id, !prof.active)}
                          >
                            {prof.active ? (
                              <><UserX className="mr-2 h-4 w-4" />Desativar</>
                            ) : (
                              <><UserCheck className="mr-2 h-4 w-4" />Ativar</>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {dialogOpen && (
        <ProfessionalDialog
          open={dialogOpen}
          onOpenChange={(v) => {
            setDialogOpen(v);
            if (!v) setEditing(null);
          }}
          professional={editing}
          availableProfiles={unlinkedProfiles}
          onSave={handleSave}
        />
      )}
    </AppLayout>
  );
}
