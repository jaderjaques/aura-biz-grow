import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, FileText, Loader2, Receipt,
} from "lucide-react";
import { useTenantFiscalConfig } from "@/hooks/useTenantFiscalConfig";
import { useCreateNfse, CreateNfsePayload } from "@/hooks/useNfse";
import { TreatmentPlanWithDetails, TreatmentPlanItem } from "@/types/treatmentPlans";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: TreatmentPlanWithDetails;
  items: TreatmentPlanItem[];
}

function currentCompetencia(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function buildDiscriminacao(
  plan: TreatmentPlanWithDetails,
  items: TreatmentPlanItem[]
): string {
  const lines: string[] = [];

  if (plan.title) lines.push(plan.title);

  const itemLines = items
    .filter((i) => i.status !== "cancelled")
    .map((i) => {
      const name = i.description ?? i.procedure?.name ?? "Serviço";
      const qty = i.quantity > 1 ? ` (${i.quantity}x)` : "";
      return `- ${name}${qty}`;
    });

  if (itemLines.length > 0) lines.push(...itemLines);

  if (plan.patient?.full_name) {
    lines.push(`\nPaciente: ${plan.patient.full_name}`);
  }

  return lines.join("\n");
}

export function GenerateNfseDialog({ open, onOpenChange, plan, items }: Props) {
  const { data: fiscalConfig, isLoading: loadingConfig } = useTenantFiscalConfig();
  const { mutateAsync: createNfse, isPending: submitting } = useCreateNfse();

  // Form state
  const [competencia, setCompetencia] = useState(currentCompetencia());
  const [discriminacao, setDiscriminacao] = useState("");
  const [aliquota, setAliquota] = useState("");
  const [codigoServico, setCodigoServico] = useState("");

  // Preencher defaults da config fiscal quando abrir
  useEffect(() => {
    if (open) {
      setCompetencia(currentCompetencia());
      setDiscriminacao(buildDiscriminacao(plan, items));
      if (fiscalConfig) {
        setAliquota(
          fiscalConfig.nfse_aliquota_iss != null
            ? String(fiscalConfig.nfse_aliquota_iss)
            : ""
        );
        setCodigoServico(fiscalConfig.nfse_codigo_servico ?? "");
      }
    }
  }, [open, fiscalConfig, plan, items]);

  const fmtCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const valorServicos = plan.final_value ?? 0;
  const aliquotaNum = aliquota ? parseFloat(aliquota) : null;
  const valorIss =
    aliquotaNum != null ? +(valorServicos * (aliquotaNum / 100)).toFixed(2) : null;

  // Alertas de configuração incompleta
  const warnings: string[] = [];
  if (!fiscalConfig?.cnpj) warnings.push("CNPJ da empresa não configurado");
  if (!fiscalConfig?.razao_social) warnings.push("Razão Social não configurada");
  if (!fiscalConfig?.inscricao_municipal) warnings.push("Inscrição Municipal não configurada");
  if (!fiscalConfig?.certificate_path) warnings.push("Certificado digital não enviado");
  if (!codigoServico) warnings.push("Código de serviço não informado");

  const canSubmit =
    !submitting &&
    discriminacao.trim().length > 0 &&
    valorServicos > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // Montar mês/ano competência como primeiro dia do mês
    const compDate = competencia.length === 7
      ? `${competencia}-01`
      : competencia;

    const payload: CreateNfsePayload = {
      treatment_plan_id: plan.id,
      patient_id: plan.patient_id,
      competencia: compDate,
      discriminacao: discriminacao.trim(),
      valor_servicos: valorServicos,
      aliquota_iss: aliquotaNum,
      codigo_servico: codigoServico || fiscalConfig?.nfse_codigo_servico || null,
      cnae: fiscalConfig?.nfse_cnae ?? null,
      natureza_operacao: fiscalConfig?.nfse_natureza_operacao ?? null,
      regime_tributario: fiscalConfig?.nfse_regime_tributario ?? null,
      optante_simples: fiscalConfig?.nfse_optante_simples ?? false,
    };

    await createNfse(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Gerar NFS-e
          </DialogTitle>
        </DialogHeader>

        {loadingConfig ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 mt-1">
            {/* Avisos de configuração incompleta */}
            {warnings.length > 0 && (
              <Alert variant="destructive" className="border-yellow-300 bg-yellow-50 text-yellow-800">
                <AlertTriangle className="h-4 w-4 !text-yellow-700" />
                <AlertDescription className="space-y-1">
                  <p className="font-medium">Configurações fiscais incompletas:</p>
                  <ul className="list-disc list-inside text-xs space-y-0.5">
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                  <p className="text-xs mt-1">
                    A solicitação será salva, mas a emissão só ocorrerá após configuração completa em{" "}
                    <strong>Configurações → Empresa</strong>.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Resumo do orçamento */}
            <div className="bg-muted/40 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex items-center gap-2 font-medium mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{plan.plan_number} — {plan.title || plan.patient?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paciente</span>
                <span>{plan.patient?.full_name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor dos serviços</span>
                <span className="font-semibold">{fmtCurrency(valorServicos)}</span>
              </div>
              {fiscalConfig?.nfse_ambiente && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ambiente</span>
                  <Badge
                    variant="outline"
                    className={
                      fiscalConfig.nfse_ambiente === "producao"
                        ? "border-green-500 text-green-700"
                        : "border-yellow-500 text-yellow-700"
                    }
                  >
                    {fiscalConfig.nfse_ambiente === "producao" ? "Produção" : "Homologação"}
                  </Badge>
                </div>
              )}
            </div>

            <Separator />

            {/* Competência */}
            <div className="space-y-1.5">
              <Label>Competência (mês de referência) *</Label>
              <Input
                type="month"
                value={competencia.substring(0, 7)}
                onChange={(e) => setCompetencia(`${e.target.value}-01`)}
              />
              <p className="text-xs text-muted-foreground">
                Mês e ano em que o serviço foi prestado.
              </p>
            </div>

            {/* Código de serviço */}
            <div className="space-y-1.5">
              <Label>Código de Serviço (LC 116)</Label>
              <Input
                value={codigoServico}
                onChange={(e) => setCodigoServico(e.target.value)}
                placeholder="Ex: 4.03"
              />
              <p className="text-xs text-muted-foreground">
                Pré-preenchido das configurações fiscais. Edite se necessário.
              </p>
            </div>

            {/* Alíquota ISS */}
            <div className="space-y-1.5">
              <Label>Alíquota ISS (%)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.01}
                  value={aliquota}
                  onChange={(e) => setAliquota(e.target.value)}
                  placeholder="Ex: 3.00"
                  className="max-w-[140px]"
                />
                {valorIss != null && (
                  <span className="text-sm text-muted-foreground">
                    = <strong>{fmtCurrency(valorIss)}</strong> de ISS
                  </span>
                )}
              </div>
            </div>

            {/* Discriminação */}
            <div className="space-y-1.5">
              <Label>Discriminação dos Serviços *</Label>
              <Textarea
                value={discriminacao}
                onChange={(e) => setDiscriminacao(e.target.value)}
                placeholder="Descreva os serviços prestados..."
                rows={5}
                className="resize-none text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Pré-preenchido com os procedimentos do orçamento. Edite se necessário.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || loadingConfig}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Solicitando...
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4 mr-2" />
                Solicitar NFS-e
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
