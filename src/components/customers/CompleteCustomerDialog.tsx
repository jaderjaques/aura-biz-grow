import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { documentKind, isFilled, isValidEmail, isValidPhone } from "@/lib/documents";

export interface CustomerDraft {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  documento: string;
}

export type DraftField = keyof CustomerDraft;

const LABELS: Record<DraftField, string> = {
  company_name: "Nome ou razão social",
  contact_name: "Nome do contato",
  email: "E-mail",
  phone: "WhatsApp ou telefone",
  documento: "CPF ou CNPJ",
};

interface Props {
  open: boolean;
  draft: CustomerDraft;
  missing: DraftField[];
  title?: string;
  onSubmit: (values: CustomerDraft) => Promise<void>;
  onCancel: () => void;
}

function validate(v: CustomerDraft): Partial<Record<DraftField, string>> {
  const e: Partial<Record<DraftField, string>> = {};
  if (!isFilled(v.company_name)) e.company_name = "Informe o nome ou a razão social.";
  if (!isFilled(v.contact_name)) e.contact_name = "Informe o nome do contato.";
  if (!isValidEmail(v.email)) e.email = "Informe um e-mail válido.";
  if (!isValidPhone(v.phone)) e.phone = "Informe o telefone com DDD.";
  if (v.documento.trim() && !documentKind(v.documento)) e.documento = "CPF ou CNPJ inválido. Confira os números ou deixe em branco.";
  return e;
}

// Janela que aparece quando uma proposta ou um lead vira ganho mas faltam dados para criar o cliente.
export function CompleteCustomerDialog({ open, draft, missing, title, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<CustomerDraft>(draft);
  const [errors, setErrors] = useState<Partial<Record<DraftField, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(draft);
      setErrors({});
    }
  }, [open, draft]);

  const set = (k: DraftField, v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  }

  const field = (k: DraftField, opts: { type?: string; placeholder?: string; autoComplete?: string; inputMode?: "text" | "tel" | "email" | "numeric" } = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`cc-${k}`}>
        {LABELS[k]}
        {k === "documento" ? <span className="text-muted-foreground font-normal"> (opcional)</span> : <span className="text-destructive"> *</span>}
        {missing.includes(k) && k !== "documento" && <span className="ml-2 text-xs font-normal text-amber-600">falta preencher</span>}
      </Label>
      <Input
        id={`cc-${k}`}
        value={values[k]}
        onChange={(ev) => set(k, ev.target.value)}
        type={opts.type ?? "text"}
        inputMode={opts.inputMode}
        autoComplete={opts.autoComplete ?? "off"}
        placeholder={opts.placeholder}
        aria-invalid={!!errors[k]}
        className={errors[k] ? "border-destructive" : missing.includes(k) ? "border-amber-400" : undefined}
      />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onCancel(); }}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? "Cadastrar o cliente"}</DialogTitle>
          <DialogDescription>
            Para registrar o ganho, o cliente precisa estar cadastrado. Complete o que falta e ele é criado automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {field("company_name", { placeholder: "Ex.: Empresa Ltda ou Maria Silva" })}
          {field("contact_name", { autoComplete: "name" })}
          {field("email", { type: "email", inputMode: "email", placeholder: "cliente@empresa.com.br" })}
          {field("phone", { type: "tel", inputMode: "tel", placeholder: "(31) 99999-0000" })}
          {field("documento", { inputMode: "numeric", placeholder: "Somente números ou com pontuação" })}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar cliente e registrar o ganho
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
