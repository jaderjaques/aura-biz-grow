import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AnamnesisTemplate, AnamnesisField, MedicalRecord } from "@/types/records";

interface AnamnesisFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: AnamnesisTemplate[];
  onSave: (data: Partial<MedicalRecord>) => Promise<any>;
}

export function AnamnesisForm({ open, onOpenChange, templates, onSave }: AnamnesisFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<AnamnesisTemplate | null>(
    templates.find((t) => t.is_default) ?? templates[0] ?? null
  );
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const setAnswer = (fieldId: string, value: any) =>
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));

  const isVisible = (field: AnamnesisField) => {
    if (!field.showIf) return true;
    return answers[field.showIf.field] === field.showIf.value;
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      await onSave({
        record_type: "anamnesis",
        title: `Anamnese — ${selectedTemplate.name}`,
        content: { template_id: selectedTemplate.id, template_name: selectedTemplate.name, answers },
      });
      setAnswers({});
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: AnamnesisField) => {
    if (!isVisible(field)) return null;

    return (
      <div key={field.id} className="space-y-1">
        <Label className="text-sm">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>

        {field.type === "boolean" && (
          <div className="flex items-center gap-2">
            <Switch
              checked={!!answers[field.id]}
              onCheckedChange={(v) => setAnswer(field.id, v)}
            />
            <span className="text-sm text-muted-foreground">
              {answers[field.id] ? "Sim" : "Não"}
            </span>
          </div>
        )}

        {field.type === "text" && (
          <Input
            value={answers[field.id] ?? ""}
            onChange={(e) => setAnswer(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        )}

        {field.type === "textarea" && (
          <Textarea
            value={answers[field.id] ?? ""}
            onChange={(e) => setAnswer(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
          />
        )}

        {field.type === "number" && (
          <Input
            type="number"
            value={answers[field.id] ?? ""}
            onChange={(e) => setAnswer(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        )}

        {field.type === "date" && (
          <Input
            type="date"
            value={answers[field.id] ?? ""}
            onChange={(e) => setAnswer(field.id, e.target.value)}
          />
        )}

        {field.type === "select" && field.options && (
          <Select value={answers[field.id] ?? ""} onValueChange={(v) => setAnswer(field.id, v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {field.type === "multiselect" && field.options && (
          <div className="flex flex-wrap gap-2">
            {field.options.map((opt) => {
              const selected: string[] = answers[field.id] ?? [];
              const isSelected = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const next = isSelected
                      ? selected.filter((v) => v !== opt)
                      : [...selected, opt];
                    setAnswer(field.id, next);
                  }}
                  className={`px-3 py-1 rounded-full text-xs border transition ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Anamnese</DialogTitle>
        </DialogHeader>

        {templates.length > 1 && (
          <div className="space-y-1 mt-2">
            <Label>Modelo de anamnese</Label>
            <Select
              value={selectedTemplate?.id ?? ""}
              onValueChange={(id) =>
                setSelectedTemplate(templates.find((t) => t.id === id) ?? null)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o modelo" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedTemplate ? (
          <div className="space-y-5 mt-2">
            {selectedTemplate.fields.map((field) => renderField(field))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum modelo de anamnese disponível.
          </p>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !selectedTemplate}>
            {saving ? "Salvando..." : "Salvar Anamnese"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
