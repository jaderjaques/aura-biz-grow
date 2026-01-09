import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ContractWithDetails } from "@/types/customers";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface EditContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractWithDetails | null;
  onSuccess?: () => void;
}

interface ContractFormData {
  status: string;
  recurring_value: number;
  setup_value: number;
  start_date: string;
  end_date: string;
  billing_cycle: string;
  payment_day: number;
  auto_renew: boolean;
  renewal_notice_days: number;
}

const statusOptions = [
  { value: "draft", label: "Rascunho" },
  { value: "sent", label: "Enviado" },
  { value: "pending_signature", label: "Aguardando Assinatura" },
  { value: "signed", label: "Assinado" },
  { value: "active", label: "Ativo" },
  { value: "suspended", label: "Suspenso" },
  { value: "cancelled", label: "Cancelado" },
  { value: "expired", label: "Expirado" },
];

export function EditContractDialog({
  open,
  onOpenChange,
  contract,
  onSuccess,
}: EditContractDialogProps) {
  const { toast } = useToast();
  const { register, handleSubmit, watch, setValue, reset } = useForm<ContractFormData>();

  useEffect(() => {
    if (contract && open) {
      reset({
        status: contract.status || "draft",
        recurring_value: Number(contract.recurring_value) || 0,
        setup_value: Number(contract.setup_value) || 0,
        start_date: contract.start_date ? format(new Date(contract.start_date), "yyyy-MM-dd") : "",
        end_date: contract.end_date ? format(new Date(contract.end_date), "yyyy-MM-dd") : "",
        billing_cycle: contract.billing_cycle || "monthly",
        payment_day: contract.payment_day || 10,
        auto_renew: contract.auto_renew || false,
        renewal_notice_days: contract.renewal_notice_days || 30,
      });
      setValue("status", contract.status || "draft");
      setValue("billing_cycle", contract.billing_cycle || "monthly");
    }
  }, [contract, open, reset, setValue]);

  const onSubmit = async (data: ContractFormData) => {
    if (!contract) return;

    try {
      const { error } = await supabase
        .from("contracts")
        .update({
          status: data.status,
          recurring_value: Number(data.recurring_value),
          setup_value: Number(data.setup_value),
          start_date: data.start_date,
          end_date: data.end_date || null,
          billing_cycle: data.billing_cycle,
          payment_day: data.payment_day,
          auto_renew: data.auto_renew,
          renewal_notice_days: data.renewal_notice_days,
        })
        .eq("id", contract.id);

      if (error) throw error;

      toast({
        title: "Contrato atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar contrato",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Contrato {contract.contract_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Status */}
          <div className="space-y-2">
            <Label>Status do Contrato</Label>
            <Select
              value={watch("status")}
              onValueChange={(value) => setValue("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Recorrente (R$/mês)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("recurring_value")}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Setup (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("setup_value")}
              />
            </div>
          </div>

          {/* MRR Preview */}
          <Card className="bg-primary/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">MRR:</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(watch("recurring_value") || 0)}/mês
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input
                type="date"
                {...register("start_date")}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Término</Label>
              <Input
                type="date"
                {...register("end_date")}
              />
            </div>
          </div>

          {/* Ciclo de Cobrança */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ciclo de Cobrança</Label>
              <Select
                value={watch("billing_cycle")}
                onValueChange={(value) => setValue("billing_cycle", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="semiannual">Semestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dia do Pagamento</Label>
              <Input
                type="number"
                min="1"
                max="28"
                {...register("payment_day")}
              />
            </div>
          </div>

          {/* Renovação */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto_renew"
                checked={watch("auto_renew")}
                onCheckedChange={(checked) => setValue("auto_renew", !!checked)}
              />
              <Label htmlFor="auto_renew" className="font-normal">
                Renovação automática
              </Label>
            </div>

            {watch("auto_renew") && (
              <div className="space-y-2">
                <Label>Dias de antecedência para aviso de renovação</Label>
                <Input
                  type="number"
                  min="7"
                  max="90"
                  {...register("renewal_notice_days")}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
