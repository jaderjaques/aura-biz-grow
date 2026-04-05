import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, ChevronDown, ChevronRight, FileText, Stethoscope,
  ClipboardList, Smile,
} from "lucide-react";
import { useRecords } from "@/hooks/useRecords";
import { EvolutionDialog } from "./EvolutionDialog";
import { AnamnesisForm } from "./AnamnesisForm";
import { OdontogramComponent } from "./OdontogramComponent";
import { MedicalRecord, RECORD_TYPE_LABELS, RecordType } from "@/types/records";

interface MedicalRecordsTabProps {
  patientId: string;
  showOdontogram?: boolean;
}

const RECORD_ICONS: Record<RecordType, React.ReactNode> = {
  anamnesis: <ClipboardList className="h-4 w-4" />,
  evolution: <Stethoscope className="h-4 w-4" />,
  prescription: <FileText className="h-4 w-4" />,
  exam: <FileText className="h-4 w-4" />,
  certificate: <FileText className="h-4 w-4" />,
  odontogram: <Smile className="h-4 w-4" />,
};

const RECORD_TYPE_COLORS: Record<RecordType, string> = {
  anamnesis: "secondary",
  evolution: "default",
  prescription: "outline",
  exam: "outline",
  certificate: "outline",
  odontogram: "outline",
} as const;

function RecordCard({ record }: { record: MedicalRecord }) {
  const [open, setOpen] = useState(false);

  const renderContent = () => {
    if (record.record_type === "evolution") {
      return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.content.text}</p>;
    }
    if (record.record_type === "anamnesis") {
      const { answers, template_name } = record.content;
      if (!answers) return null;
      return (
        <div className="space-y-1">
          {template_name && (
            <p className="text-xs text-muted-foreground mb-2">Modelo: {template_name}</p>
          )}
          {Object.entries(answers).map(([key, value]) => (
            <div key={key} className="flex gap-2 text-sm">
              <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
              <span>{Array.isArray(value) ? value.join(", ") : String(value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return (
      <pre className="text-xs text-muted-foreground overflow-auto">
        {JSON.stringify(record.content, null, 2)}
      </pre>
    );
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition text-left"
      >
        <div className="text-muted-foreground">{RECORD_ICONS[record.record_type]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{record.title}</p>
            <Badge variant={RECORD_TYPE_COLORS[record.record_type] as any} className="text-xs shrink-0">
              {RECORD_TYPE_LABELS[record.record_type]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(record.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 bg-muted/20 border-t">
          {renderContent()}
        </div>
      )}
    </div>
  );
}

export function MedicalRecordsTab({ patientId, showOdontogram = false }: MedicalRecordsTabProps) {
  const { records, templates, odontogram, loading, createRecord, saveOdontogram } = useRecords(patientId);
  const [evolutionOpen, setEvolutionOpen] = useState(false);
  const [anamnesisOpen, setAnamnesisOpen] = useState(false);
  const [odontogramOpen, setOdontogramOpen] = useState(false);

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Carregando prontuário...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {records.length} {records.length === 1 ? "registro" : "registros"}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Novo Registro
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEvolutionOpen(true)}>
              <Stethoscope className="mr-2 h-4 w-4" />
              Evolução
            </DropdownMenuItem>
            {templates.length > 0 && (
              <DropdownMenuItem onClick={() => setAnamnesisOpen(true)}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Anamnese
              </DropdownMenuItem>
            )}
            {showOdontogram && (
              <DropdownMenuItem onClick={() => setOdontogramOpen(true)}>
                <Smile className="mr-2 h-4 w-4" />
                Odontograma
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Odontogram panel (collapsible) */}
      {showOdontogram && odontogramOpen && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm flex items-center gap-2">
                <Smile className="h-4 w-4" /> Odontograma
              </p>
              <Button variant="ghost" size="sm" onClick={() => setOdontogramOpen(false)}>
                Fechar
              </Button>
            </div>
            <OdontogramComponent
              initialTeeth={odontogram?.teeth_status ?? {}}
              initialNotes={odontogram?.notes ?? ""}
              onSave={saveOdontogram}
            />
            {odontogram && (
              <p className="text-xs text-muted-foreground mt-2">
                Última atualização: {format(new Date(odontogram.updated_at), "dd/MM/yyyy", { locale: ptBR })} — versão {odontogram.version}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current odontogram summary (when closed) */}
      {showOdontogram && !odontogramOpen && odontogram && (
        <button
          onClick={() => setOdontogramOpen(true)}
          className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition text-left"
        >
          <Smile className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Odontograma</p>
            <p className="text-xs text-muted-foreground">
              Versão {odontogram.version} — {format(new Date(odontogram.updated_at), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      )}

      {/* Records timeline */}
      {records.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Nenhum registro no prontuário.
          <br />
          Comece adicionando uma evolução ou anamnese.
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <RecordCard key={r.id} record={r} />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <EvolutionDialog
        open={evolutionOpen}
        onOpenChange={setEvolutionOpen}
        onSave={createRecord}
      />
      <AnamnesisForm
        open={anamnesisOpen}
        onOpenChange={setAnamnesisOpen}
        templates={templates}
        onSave={createRecord}
      />
    </div>
  );
}
