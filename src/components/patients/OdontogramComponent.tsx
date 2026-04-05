import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { TeethStatus, ToothStatus, TOOTH_STATUS_LABELS, TOOTH_STATUS_COLORS } from "@/types/records";
import { Save } from "lucide-react";

// FDI tooth numbering
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT  = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_LEFT  = [31, 32, 33, 34, 35, 36, 37, 38];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];

const ALL_STATUSES: ToothStatus[] = [
  "healthy", "cavity", "restored", "crown", "implant",
  "missing", "extracted", "bridge", "root_canal", "fracture",
];

interface OdontogramComponentProps {
  initialTeeth?: TeethStatus;
  initialNotes?: string;
  onSave: (teeth: TeethStatus, notes: string) => Promise<void>;
  readonly?: boolean;
}

export function OdontogramComponent({
  initialTeeth = {},
  initialNotes = "",
  onSave,
  readonly = false,
}: OdontogramComponentProps) {
  const [teeth, setTeeth] = useState<TeethStatus>(initialTeeth);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const getToothStatus = (tooth: number): ToothStatus =>
    teeth[tooth.toString()]?.status ?? "healthy";

  const setToothStatus = (tooth: number, status: ToothStatus) => {
    setTeeth((prev) => ({
      ...prev,
      [tooth.toString()]: { ...prev[tooth.toString()], status },
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(teeth, notes);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const ToothButton = ({ number }: { number: number }) => {
    const status = getToothStatus(number);
    const color = TOOTH_STATUS_COLORS[status];

    if (readonly) {
      return (
        <div
          className="flex flex-col items-center gap-0.5"
          title={`${number} — ${TOOTH_STATUS_LABELS[status]}`}
        >
          <div
            className="w-7 h-7 rounded border border-border flex items-center justify-center text-[10px] font-semibold"
            style={{ backgroundColor: color, color: status === "missing" || status === "extracted" ? "#fff" : "#111" }}
          >
            {number % 10}
          </div>
          <span className="text-[9px] text-muted-foreground">{number}</span>
        </div>
      );
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div
            className="flex flex-col items-center gap-0.5 cursor-pointer group"
            title={`${number} — ${TOOTH_STATUS_LABELS[status]}`}
          >
            <div
              className="w-7 h-7 rounded border border-border flex items-center justify-center text-[10px] font-semibold group-hover:ring-2 ring-primary transition"
              style={{ backgroundColor: color, color: status === "missing" || status === "extracted" ? "#fff" : "#111" }}
            >
              {number % 10}
            </div>
            <span className="text-[9px] text-muted-foreground">{number}</span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-2" side="bottom">
          <p className="text-xs font-semibold mb-2">Dente {number}</p>
          <div className="grid grid-cols-1 gap-0.5">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setToothStatus(number, s)}
                className={`flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted transition ${status === s ? "ring-1 ring-primary bg-muted" : ""}`}
              >
                <span
                  className="w-3 h-3 rounded-sm border border-border flex-shrink-0"
                  style={{ backgroundColor: TOOTH_STATUS_COLORS[s] }}
                />
                {TOOTH_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const QuadrantRow = ({ teeth: row }: { teeth: number[] }) => (
    <div className="flex gap-1 justify-center">
      {row.map((n) => <ToothButton key={n} number={n} />)}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <div key={s} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span
              className="w-3 h-3 rounded-sm border border-border"
              style={{ backgroundColor: TOOTH_STATUS_COLORS[s] }}
            />
            {TOOTH_STATUS_LABELS[s]}
          </div>
        ))}
      </div>

      {/* Upper jaw */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground text-center">Superior</p>
        <div className="flex justify-center gap-4">
          <div className="border-r pr-4">
            <QuadrantRow teeth={UPPER_RIGHT} />
          </div>
          <div className="pl-4">
            <QuadrantRow teeth={UPPER_LEFT} />
          </div>
        </div>
      </div>

      {/* Jaw divider */}
      <div className="border-t border-dashed border-muted-foreground/30" />

      {/* Lower jaw */}
      <div className="space-y-1">
        <div className="flex justify-center gap-4">
          <div className="border-r pr-4">
            <QuadrantRow teeth={LOWER_RIGHT} />
          </div>
          <div className="pl-4">
            <QuadrantRow teeth={LOWER_LEFT} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">Inferior</p>
      </div>

      {!readonly && (
        <>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Observações do odontograma</Label>
            <Textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
              placeholder="Anotações gerais sobre o estado bucal..."
              rows={2}
            />
          </div>

          <Button onClick={handleSave} disabled={saving || !dirty} size="sm">
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? "Salvando..." : "Salvar Odontograma"}
          </Button>
        </>
      )}
    </div>
  );
}
