import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Eye, Shield, MessageCircle, Trash2 } from "lucide-react";
import { PatientWithDetails, PatientStatus, GENDER_LABELS } from "@/types/patients";

interface PatientsTableProps {
  patients: PatientWithDetails[];
  onView: (patient: PatientWithDetails) => void;
  onDelete: (id: string) => void;
}

export function PatientsTable({ patients, onView, onDelete }: PatientsTableProps) {
  const getStatusBadge = (status: PatientStatus) => {
    const map: Record<PatientStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      active: { label: "Ativo", variant: "default" },
      inactive: { label: "Inativo", variant: "secondary" },
      blocked: { label: "Bloqueado", variant: "destructive" },
    };
    const cfg = map[status] || map.inactive;
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  const calcAge = (birth_date: string | null) => {
    if (!birth_date) return null;
    const age = Math.floor(
      (Date.now() - new Date(birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    return `${age} anos`;
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (patients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum paciente encontrado.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Paciente</TableHead>
          <TableHead>Contato</TableHead>
          <TableHead>Idade / Gênero</TableHead>
          <TableHead>Convênio</TableHead>
          <TableHead>Origem</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Cadastro</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {patients.map((patient) => (
          <TableRow
            key={patient.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onView(patient)}
          >
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={patient.photo_url ?? undefined} alt={patient.full_name} className="object-cover" />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(patient.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{patient.full_name}</p>
                  {patient.cpf && (
                    <p className="text-xs text-muted-foreground">{patient.cpf}</p>
                  )}
                </div>
              </div>
            </TableCell>

            <TableCell>
              <div>
                <p className="text-sm">{patient.phone}</p>
                {patient.email && (
                  <p className="text-xs text-muted-foreground">{patient.email}</p>
                )}
              </div>
            </TableCell>

            <TableCell>
              <div className="text-sm">
                <p>{calcAge(patient.birth_date) || "-"}</p>
                {patient.gender && (
                  <p className="text-xs text-muted-foreground">
                    {GENDER_LABELS[patient.gender]}
                  </p>
                )}
              </div>
            </TableCell>

            <TableCell>
              {patient.insurance ? (
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-blue-500" />
                  <span className="text-sm">{patient.insurance.name}</span>
                </div>
              ) : (
                <Badge variant="outline" className="text-xs">Particular</Badge>
              )}
            </TableCell>

            <TableCell>
              <span className="text-sm text-muted-foreground capitalize">
                {patient.source === "referral" ? "Indicação"
                  : patient.source === "direct" ? "Direto"
                  : patient.source === "instagram" ? "Instagram"
                  : patient.source === "google" ? "Google"
                  : patient.source}
              </span>
            </TableCell>

            <TableCell>{getStatusBadge(patient.status)}</TableCell>

            <TableCell>
              <span className="text-sm text-muted-foreground">
                {format(new Date(patient.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </TableCell>

            <TableCell onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(patient)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={`https://wa.me/${patient.whatsapp?.replace(/\D/g, "") || patient.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(patient.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
