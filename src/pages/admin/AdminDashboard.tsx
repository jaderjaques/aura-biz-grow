import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Activity, TrendingUp, AlertCircle } from "lucide-react";
import { useAdminTenants } from "@/hooks/useSuperAdmin";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const MODULE_LABELS: Record<string, string> = {
  agency: "Agência",
  clinic_dental: "Clínica Odonto",
  clinic_aesthetics: "Clínica Estética",
};

const MODULE_COLORS: Record<string, string> = {
  agency: "bg-blue-500",
  clinic_dental: "bg-emerald-500",
  clinic_aesthetics: "bg-pink-500",
};

export default function AdminDashboard() {
  const { tenants, loading } = useAdminTenants();
  const navigate = useNavigate();

  const active = tenants.filter((t) => t.active);
  const inactive = tenants.filter((t) => !t.active);
  const mrr = active
    .filter((t) => t.monthly_price)
    .reduce((sum, t) => sum + (t.monthly_price ?? 0), 0);

  const byModule = tenants.reduce<Record<string, number>>((acc, t) => {
    const mod = t.module ?? "agency";
    acc[mod] = (acc[mod] ?? 0) + 1;
    return acc;
  }, {});

  const recent = [...tenants].slice(0, 5);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral dos contratos ativos</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{tenants.length}</p>
                <p className="text-xs text-muted-foreground">Total de empresas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Activity className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">{active.length}</p>
                <p className="text-xs text-muted-foreground">Contratos ativos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-red-500">{inactive.length}</p>
                <p className="text-xs text-muted-foreground">Inativos / Inadimplentes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">
                  {mrr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <p className="text-xs text-muted-foreground">MRR (contratos ativos)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Por módulo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contratos por Módulo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(byModule).map(([mod, count]) => (
                <div key={mod} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${MODULE_COLORS[mod] ?? "bg-gray-400"}`} />
                    <span className="text-sm">{MODULE_LABELS[mod] ?? mod}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${MODULE_COLORS[mod] ?? "bg-gray-400"}`}
                        style={{ width: `${(count / tenants.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
              {Object.keys(byModule).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma empresa cadastrada.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Empresas recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Empresas Recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : recent.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma empresa cadastrada.
                </p>
              ) : (
                recent.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/admin/empresas/${t.id}`)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold
                          ${MODULE_COLORS[t.module ?? "agency"] ?? "bg-gray-500"}`}
                      >
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{t.subdomain}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={t.active ? "default" : "secondary"} className="text-xs">
                        {t.active ? "Ativa" : "Inativa"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(t.created_at), "dd/MM/yy", { locale: ptBR })}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
