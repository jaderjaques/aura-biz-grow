import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Percent, DollarSign, TrendingUp, Save, RefreshCw, Lock } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

export default function PricingSettings() {
  const { isAdmin, profile } = useAuth();

  // Redireciona se não for admin
  if (!isAdmin) {
    return <Navigate to="/configuracoes/roles" replace />;
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [priceAdjustment, setPriceAdjustment] = useState<string>("");
  const [commissionAdjustment, setCommissionAdjustment] = useState<string>("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tenant_config")
        .select("settings")
        .eq("subdomain", profile?.tenant_id)
        .maybeSingle();

      if (error) throw error;

      const s = (data?.settings as Record<string, any>) ?? {};
      setPriceAdjustment(s.procedure_price_adjustment != null ? String(s.procedure_price_adjustment) : "");
      setCommissionAdjustment(s.commission_adjustment != null ? String(s.commission_adjustment) : "");
    } catch (err: any) {
      toast.error("Erro ao carregar configurações: " + (err.message ?? ""));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const priceVal = priceAdjustment !== "" ? parseFloat(priceAdjustment) : null;
    const commissionVal = commissionAdjustment !== "" ? parseFloat(commissionAdjustment) : null;

    if (priceVal !== null && (priceVal < -100 || priceVal > 1000)) {
      toast.error("Ajuste de preço deve estar entre -100% e 1000%.");
      return;
    }
    if (commissionVal !== null && (commissionVal < -100 || commissionVal > 1000)) {
      toast.error("Ajuste de comissionamento deve estar entre -100% e 1000%.");
      return;
    }

    setSaving(true);
    try {
      // Busca settings atual para fazer merge
      const { data: current } = await supabase
        .from("tenant_config")
        .select("settings")
        .eq("subdomain", profile?.tenant_id)
        .maybeSingle();

      const existingSettings = (current?.settings as Record<string, any>) ?? {};
      const newSettings = {
        ...existingSettings,
        procedure_price_adjustment: priceVal,
        commission_adjustment: commissionVal,
      };

      const { error } = await supabase
        .from("tenant_config")
        .update({ settings: newSettings })
        .eq("subdomain", profile?.tenant_id);

      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message ?? ""));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const priceNum = priceAdjustment !== "" ? parseFloat(priceAdjustment) : null;
  const commissionNum = commissionAdjustment !== "" ? parseFloat(commissionAdjustment) : null;

  return (
    <AppLayout>
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Precificação</h1>
        <p className="text-muted-foreground">Ajustes globais de preços e comissionamento</p>
      </div>
      {/* Header admin-only */}
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Visível apenas para administradores</span>
        <Badge variant="outline" className="ml-1 text-xs">Admin</Badge>
      </div>

      {/* Ajuste geral de preços */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Ajuste Geral de Preços</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Aplica um percentual de ajuste sobre todos os procedimentos cadastrados.
                Use valores negativos para desconto.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="space-y-1 w-48">
              <Label>Percentual de ajuste</Label>
              <div className="relative">
                <Input
                  type="number"
                  step={0.1}
                  value={priceAdjustment}
                  onChange={(e) => setPriceAdjustment(e.target.value)}
                  placeholder="Ex: 10 ou -5"
                  className="pr-8"
                />
                <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            {priceNum !== null && (
              <div className={`text-sm font-medium pb-2 ${priceNum > 0 ? "text-emerald-600" : priceNum < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {priceNum > 0 ? "▲" : priceNum < 0 ? "▼" : "—"} {Math.abs(priceNum)}% {priceNum > 0 ? "acréscimo" : priceNum < 0 ? "desconto" : "neutro"}
              </div>
            )}
          </div>

          {priceNum !== null && priceNum !== 0 && (
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Exemplo de impacto:</p>
              <p>Procedimento de <strong>R$ 100,00</strong> → <strong>R$ {(100 * (1 + priceNum / 100)).toFixed(2)}</strong></p>
              <p>Procedimento de <strong>R$ 250,00</strong> → <strong>R$ {(250 * (1 + priceNum / 100)).toFixed(2)}</strong></p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ajuste de comissionamento */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950">
              <DollarSign className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">Ajuste de Comissionamento</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Aplica um percentual de ajuste sobre as comissões configuradas individualmente
                para cada dentista. Use valores negativos para reduzir.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="space-y-1 w-48">
              <Label>Percentual de ajuste</Label>
              <div className="relative">
                <Input
                  type="number"
                  step={0.1}
                  value={commissionAdjustment}
                  onChange={(e) => setCommissionAdjustment(e.target.value)}
                  placeholder="Ex: 5 ou -10"
                  className="pr-8"
                />
                <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            {commissionNum !== null && (
              <div className={`text-sm font-medium pb-2 ${commissionNum > 0 ? "text-emerald-600" : commissionNum < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {commissionNum > 0 ? "▲" : commissionNum < 0 ? "▼" : "—"} {Math.abs(commissionNum)}% {commissionNum > 0 ? "acréscimo" : commissionNum < 0 ? "redução" : "neutro"}
              </div>
            )}
          </div>

          {commissionNum !== null && commissionNum !== 0 && (
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Exemplo de impacto:</p>
              <p>Dentista com <strong>30%</strong> de comissão → efetivo: <strong>{(30 * (1 + commissionNum / 100)).toFixed(1)}%</strong></p>
              <p>Dentista com comissão fixa de <strong>R$ 50,00</strong> → efetivo: <strong>R$ {(50 * (1 + commissionNum / 100)).toFixed(2)}</strong></p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={fetchSettings} disabled={saving}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Descartar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1.5" />
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </div>
    </AppLayout>
  );
}
