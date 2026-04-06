import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Building2, MoreHorizontal, Settings, Users,
} from "lucide-react";
import { useAdminTenants } from "@/hooks/useSuperAdmin";

const MODULE_LABELS: Record<string, string> = {
  agency: "Agência",
  clinic_dental: "Clínica Odonto",
  clinic_aesthetics: "Clínica Estética",
};

const MODULE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  agency: "default",
  clinic_dental: "secondary",
  clinic_aesthetics: "outline",
};

export default function AdminTenants() {
  const { tenants, loading, toggleActive } = useAdminTenants();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  const filtered = tenants.filter((t) => {
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.subdomain ?? "").toLowerCase().includes(search.toLowerCase());
    const matchModule = moduleFilter === "all" || t.module === moduleFilter;
    return matchSearch && matchModule;
  });

  const fmtCurrency = (v: number | null) =>
    v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

  const total = tenants.length;
  const active = tenants.filter((t) => t.active).length;
  const totalUsers = tenants.reduce((s, t) => s + (t.user_count ?? 0), 0);
  const mrr = tenants
    .filter((t) => t.active && t.monthly_price)
    .reduce((s, t) => s + (t.monthly_price ?? 0), 0);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-muted-foreground text-sm">
            {total} empresa{total !== 1 ? "s" : ""} cadastrada{total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total", value: total, color: "text-foreground" },
            { label: "Ativas", value: active, color: "text-green-600" },
            { label: "Usuários totais", value: totalUsers, color: "text-blue-600" },
            { label: "MRR", value: fmtCurrency(mrr), color: "text-amber-600" },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="pt-4 pb-4">
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou subdomínio..."
              className="pl-9"
            />
          </div>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os módulos</SelectItem>
              <SelectItem value="agency">Agência</SelectItem>
              <SelectItem value="clinic_dental">Clínica Odonto</SelectItem>
              <SelectItem value="clinic_aesthetics">Clínica Estética</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma empresa encontrada.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>MRR</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/empresas/${t.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.subdomain}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={MODULE_VARIANTS[t.module ?? "agency"]}>
                        {MODULE_LABELS[t.module ?? "agency"]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.plan_tier ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {t.user_count ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {fmtCurrency(t.monthly_price)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(t.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={t.active}
                        onCheckedChange={(v) => toggleActive(t.id, v)}
                      />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/empresas/${t.id}`)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Editar configurações
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/admin/usuarios?tenant=${t.subdomain}`)}>
                            <Users className="mr-2 h-4 w-4" />
                            Ver usuários
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
