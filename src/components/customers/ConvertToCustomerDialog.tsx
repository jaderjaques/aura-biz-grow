import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { getCurrentProfile } from "@/lib/tenant-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, InfoIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomers } from "@/hooks/useCustomers";
import { DealWithDetails } from "@/types/products";

interface ConvertToCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: DealWithDetails | null;
  onSuccess?: (customerId: string) => void;
}

interface FormData {
  company_name: string;
  trading_name: string;
  cnpj: string;
  segment: string;
  contact_name: string;
  position: string;
  phone: string;
  email: string;
  zip_code: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  account_manager: string;
  customer_since: string;
  generate_contract: boolean;
  template_id: string;
  start_date: string;
  end_date: string;
  payment_day: number;
}

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

export function ConvertToCustomerDialog({
  open,
  onOpenChange,
  deal,
  onSuccess,
}: ConvertToCustomerDialogProps) {
  const { templates, createCustomer } = useCustomers();
  const [users, setUsers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generateContract, setGenerateContract] = useState(true);

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      generate_contract: true,
      payment_day: 10,
      customer_since: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (deal?.lead) {
      setValue("company_name", deal.lead.company_name || "");
      setValue("trading_name", deal.lead.trading_name || "");
      setValue("cnpj", deal.lead.cnpj || "");
      setValue("segment", deal.lead.segment || "");
      setValue("contact_name", deal.lead.contact_name || "");
      setValue("position", deal.lead.position || "");
      setValue("phone", deal.lead.phone || "");
      setValue("email", deal.lead.email || "");
      setValue("start_date", new Date().toISOString().split("T")[0]);
      
      // End date = 1 year from now
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      setValue("end_date", endDate.toISOString().split("T")[0]);
    }
  }, [deal, setValue]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true);
      setUsers(data || []);
    };
    fetchUsers();
  }, []);

  const onSubmit = async (data: FormData) => {
    if (!deal) return;
    
    setIsSubmitting(true);
    try {
      // 1. Create customer
      const customer = await createCustomer({
        lead_id: deal.lead_id,
        deal_id: deal.id,
        company_name: data.company_name,
        trading_name: data.trading_name || null,
        cnpj: data.cnpj || null,
        segment: data.segment || null,
        contact_name: data.contact_name,
        position: data.position || null,
        phone: data.phone,
        email: data.email,
        zip_code: data.zip_code || null,
        street: data.street || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        account_manager: data.account_manager || null,
        customer_since: data.customer_since,
        status: "active",
      });

      // 2. Update lead status
      if (deal.lead_id) {
        await supabase
          .from("leads")
          .update({ status: "convertido" })
          .eq("id", deal.lead_id);
      }

      // 3. Update deal status
      await supabase
        .from("deals")
        .update({
          status: "won",
          actual_close_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", deal.id);

      // 4. Create contract if checked
      if (generateContract && data.template_id) {
        const profile = await getCurrentProfile();

        await supabase.from("contracts").insert({
          customer_id: customer.id,
          deal_id: deal.id,
          template_id: data.template_id,
          title: `Contrato - ${data.company_name}`,
          start_date: data.start_date,
          end_date: data.end_date || null,
          setup_value: deal.setup_value,
          recurring_value: deal.recurring_value,
          payment_day: data.payment_day,
          payment_method: deal.payment_terms || "boleto",
          products: deal.deal_products as any,
          status: "draft",
          created_by: profile.id,
          tenant_id: profile.tenant_id,
          contract_number: "", // Will be auto-generated by trigger
        });
      }

      reset();
      onOpenChange(false);
      onSuccess?.(customer.id);
    } catch (error) {
      console.error("Error converting to customer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Converter em Cliente 🎉
          </DialogTitle>
          <DialogDescription>
            Parabéns! Vamos criar o cadastro do cliente e gerar o contrato.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Os dados abaixo foram importados do lead. Revise e complete as informações.
            </AlertDescription>
          </Alert>

          {/* Dados da Empresa */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="company_name">Razão Social *</Label>
                  <Input id="company_name" {...register("company_name")} required />
                </div>
                <div>
                  <Label htmlFor="trading_name">Nome Fantasia</Label>
                  <Input id="trading_name" {...register("trading_name")} />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input id="cnpj" {...register("cnpj")} placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <Label htmlFor="segment">Segmento</Label>
                  <Select onValueChange={(v) => setValue("segment", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinica">Clínica</SelectItem>
                      <SelectItem value="escritorio">Escritório</SelectItem>
                      <SelectItem value="consultoria">Consultoria</SelectItem>
                      <SelectItem value="comercio">Comércio</SelectItem>
                      <SelectItem value="servicos">Serviços</SelectItem>
                      <SelectItem value="industria">Indústria</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contato Principal */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contato Principal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_name">Nome Completo *</Label>
                  <Input id="contact_name" {...register("contact_name")} required />
                </div>
                <div>
                  <Label htmlFor="position">Cargo</Label>
                  <Input id="position" {...register("position")} />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input id="phone" {...register("phone")} required />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" {...register("email")} required />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Endereço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="zip_code">CEP</Label>
                  <Input id="zip_code" {...register("zip_code")} />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="street">Rua/Avenida</Label>
                  <Input id="street" {...register("street")} />
                </div>
                <div>
                  <Label htmlFor="number">Número</Label>
                  <Input id="number" {...register("number")} />
                </div>
                <div>
                  <Label htmlFor="complement">Complemento</Label>
                  <Input id="complement" {...register("complement")} />
                </div>
                <div>
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input id="neighborhood" {...register("neighborhood")} />
                </div>
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" {...register("city")} />
                </div>
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Select onValueChange={(v) => setValue("state", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gestão */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Gestão da Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="account_manager">Account Manager *</Label>
                  <Select onValueChange={(v) => setValue("account_manager", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="customer_since">Cliente Desde</Label>
                  <Input
                    id="customer_since"
                    type="date"
                    {...register("customer_since")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contrato */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generate_contract"
                  checked={generateContract}
                  onCheckedChange={(checked) => setGenerateContract(!!checked)}
                />
                <div>
                  <Label htmlFor="generate_contract" className="cursor-pointer">
                    Gerar contrato automaticamente
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Um contrato será criado com os dados da proposta fechada
                  </p>
                </div>
              </div>

              {generateContract && (
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="col-span-3">
                    <Label htmlFor="template_id">Template de Contrato</Label>
                    <Select onValueChange={(v) => setValue("template_id", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                            {template.is_default && " (Padrão)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="start_date">Início *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      {...register("start_date")}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">Fim</Label>
                    <Input id="end_date" type="date" {...register("end_date")} />
                  </div>
                  <div>
                    <Label htmlFor="payment_day">Dia Vencimento</Label>
                    <Input
                      id="payment_day"
                      type="number"
                      min="1"
                      max="31"
                      {...register("payment_day", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-green-500 to-emerald-500"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Convertendo...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Converter em Cliente
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
