import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { TreatmentPlan, TreatmentPlanItem, ClinicProcedure } from "@/types/treatmentPlans";
import { PatientWithDetails } from "@/types/patients";
import { Insurance } from "@/types/patients";

interface ItemForm {
  procedure_id: string;
  description: string;
  quantity: number;
  sessions_total: number;
  unit_price: number;
  discount_percent: number;
  tooth_number: string;
  body_region: string;
  notes: string;
}

const EMPTY_ITEM: ItemForm = {
  procedure_id: "",
  description: "",
  quantity: 1,
  sessions_total: 1,
  unit_price: 0,
  discount_percent: 0,
  tooth_number: "",
  body_region: "",
  notes: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: PatientWithDetails[];
  procedures: ClinicProcedure[];
  insurances: Insurance[];
  onSave: (plan: Partial<TreatmentPlan>, items: Partial<TreatmentPlanItem>[]) => Promise<any>;
}

export function NewTreatmentPlanDialog({
  open, onOpenChange, patients, procedures, insurances, onSave,
}: Props) {
  const [patientId, setPatientId] = useState("");
  const [title, setTitle] = useState("");
  const [paymentType, setPaymentType] = useState("private");
  const [insuranceId, setInsuranceId] = useState("");
  const [paymentConditions, setPaymentConditions] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemForm[]>([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);

  const calcItemTotal = (item: ItemForm) => {
    const subtotal = item.unit_price * item.quantity;
    return subtotal * (1 - item.discount_percent / 100);
  };

  const totalValue = items.reduce((sum, i) => sum + calcItemTotal(i), 0);
  const discountAmount = totalValue * (discountPercent / 100);
  const finalValue = totalValue - discountAmount;

  const handleProcedureSelect = (idx: number, procedureId: string) => {
    const proc = procedures.find((p) => p.id === procedureId);
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              procedure_id: procedureId,
              description: proc?.name ?? "",
              unit_price: proc?.price_private ?? 0,
              sessions_total: proc?.sessions_default ?? 1,
            }
          : item
      )
    );
  };

  const updateItem = (idx: number, field: keyof ItemForm, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const reset = () => {
    setPatientId("");
    setTitle("");
    setPaymentType("private");
    setInsuranceId("");
    setPaymentConditions("");
    setDiscountPercent(0);
    setNotes("");
    setItems([{ ...EMPTY_ITEM }]);
  };

  const handleSave = async () => {
    if (!patientId) return;
    setSaving(true);
    try {
      const planPayload: Partial<TreatmentPlan> = {
        patient_id: patientId,
        title: title || undefined,
        payment_type: paymentType,
        insurance_id: paymentType === "insurance" && insuranceId ? insuranceId : null,
        payment_conditions: paymentConditions || null,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        total_value: totalValue,
        final_value: finalValue,
        notes: notes || null,
        validity_days: 30,
      };

      const itemsPayload: Partial<TreatmentPlanItem>[] = items
        .filter((i) => i.procedure_id || i.description)
        .map((item, idx) => ({
          procedure_id: item.procedure_id || null,
          description: item.description || null,
          quantity: item.quantity,
          sessions_total: item.sessions_total,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          total_price: calcItemTotal(item),
          tooth_number: item.tooth_number || null,
          body_region: item.body_region || null,
          notes: item.notes || null,
          execution_order: idx + 1,
        }));

      await onSave(planPayload, itemsPayload);
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const fmtCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Orçamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Paciente + título */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Paciente *</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Título (opcional)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Tratamento completo, Implante..."
              />
            </div>
          </div>

          <Separator />

          {/* Itens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Procedimentos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </div>

            {items.map((item, idx) => {
              const proc = procedures.find((p) => p.id === item.procedure_id);
              const isDental = proc?.tooth_region != null;
              const isAesthetics = proc?.body_area != null;

              return (
                <div key={idx} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Item {idx + 1}
                    </span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Procedimento</Label>
                      <Select
                        value={item.procedure_id}
                        onValueChange={(v) => handleProcedureSelect(idx, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione ou descreva abaixo" />
                        </SelectTrigger>
                        <SelectContent>
                          {procedures.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {fmtCurrency(p.price_private ?? 0)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        placeholder="Descrição do item..."
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Sessões</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.sessions_total}
                        onChange={(e) => updateItem(idx, "sessions_total", Number(e.target.value))}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Valor unitário (R$)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unit_price}
                        onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Desconto (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discount_percent}
                        onChange={(e) => updateItem(idx, "discount_percent", Number(e.target.value))}
                      />
                    </div>

                    {isDental && (
                      <div className="space-y-1">
                        <Label className="text-xs">Dente(s)</Label>
                        <Input
                          value={item.tooth_number}
                          onChange={(e) => updateItem(idx, "tooth_number", e.target.value)}
                          placeholder="Ex: 11, 12"
                        />
                      </div>
                    )}

                    {isAesthetics && (
                      <div className="space-y-1">
                        <Label className="text-xs">Região</Label>
                        <Input
                          value={item.body_region}
                          onChange={(e) => updateItem(idx, "body_region", e.target.value)}
                          placeholder="Ex: Testa, Lábio superior"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Badge variant="outline" className="text-xs">
                      {fmtCurrency(calcItemTotal(item))}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Pagamento + desconto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Forma de pagamento</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Particular</SelectItem>
                  <SelectItem value="insurance">Convênio</SelectItem>
                  <SelectItem value="installment">Parcelado</SelectItem>
                  <SelectItem value="financing">Financiamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentType === "insurance" && (
              <div className="space-y-1">
                <Label>Convênio</Label>
                <Select value={insuranceId} onValueChange={setInsuranceId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {insurances.map((ins) => (
                      <SelectItem key={ins.id} value={ins.id}>{ins.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label>Desconto geral (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1">
              <Label>Condições de pagamento</Label>
              <Input
                value={paymentConditions}
                onChange={(e) => setPaymentConditions(e.target.value)}
                placeholder="Ex: 3x sem juros, entrada + 2x..."
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o orçamento..."
              rows={2}
            />
          </div>

          {/* Resumo financeiro */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{fmtCurrency(totalValue)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Desconto ({discountPercent}%)</span>
                <span>- {fmtCurrency(discountAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>{fmtCurrency(finalValue)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !patientId}>
            {saving ? "Salvando..." : "Criar Orçamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
