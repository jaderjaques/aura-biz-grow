import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MedicalRecord } from "@/types/records";

interface EvolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<MedicalRecord>) => Promise<any>;
}

export function EvolutionDialog({ open, onOpenChange, onSave }: EvolutionDialogProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await onSave({
        record_type: "evolution",
        title: title.trim() || "Evolução",
        content: { text },
      });
      setTitle("");
      setText("");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Evolução</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Título (opcional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Consulta de retorno, 1ª sessão..."
            />
          </div>
          <div className="space-y-1">
            <Label>Anotação *</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Descreva a evolução do paciente, procedimentos realizados, observações..."
              rows={6}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !text.trim()}>
            {saving ? "Salvando..." : "Salvar Evolução"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
