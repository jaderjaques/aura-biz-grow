import { useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  User,
  Phone,
  Mail,
  Globe,
  MapPin,
  DollarSign,
  TrendingUp,
  Receipt,
  FileText,
  MessageCircle,
  Pencil,
  X,
  Save,
  Package,
  Plus,
  Calendar,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CustomerWithDetails, CustomerStatus } from "@/types/customers";
import { CustomerInvoicesTab } from "./CustomerInvoicesTab";
import { CustomerContractsTab } from "./CustomerContractsTab";
import { NewServiceDialog } from "./NewServiceDialog";
import { EditServiceDialog } from "./EditServiceDialog";
import { useDeals } from "@/hooks/useDeals";
import { DealWithDetails } from "@/types/products";

interface CustomerDetailsSidebarProps {
  customer: CustomerWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (id: string, data: any) => Promise<void>;
}

export function CustomerDetailsSidebar({
  customer,
  open,
  onOpenChange,
  onUpdate,
}: CustomerDetailsSidebarProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [editingService, setEditingService] = useState<DealWithDetails | null>(null);
  const { deals: customerDeals, loading: dealsLoading, fetchDeals } = useDeals(customer?.id);
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    cnpj: "",
    segment: "",
    city: "",
    state: "",
    status: "",
    notes: "",
    customer_since: "",
  });

  if (!customer) return null;

  const startEditing = () => {
    setForm({
      company_name: customer.company_name || "",
      contact_name: customer.contact_name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      cnpj: customer.cnpj || "",
      segment: customer.segment || "",
      city: customer.city || "",
      state: customer.state || "",
      status: customer.status || "active",
      notes: customer.notes || "",
      customer_since: (customer as any).customer_since || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!onUpdate) return;
    setSaving(true);
    try {
      await onUpdate(customer.id, form);
      setIsEditing(false);
    } catch {
      // toast handled by hook
    } finally {
      setSaving(false);
    }
  };

  const handleStartChat = async () => {
    const phone = customer.phone?.replace(/\D/g, "");
    if (!phone) return;
    const jid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
    const { data: existingChat } = await supabase
      .from("chats")
      .select("id")
      .eq("remote_jid", jid)
      .maybeSingle();
    onOpenChange(false);
    if (existingChat) {
      navigate(`/inbox?chat=${existingChat.id}`);
    } else {
      navigate(`/inbox?newChat=${phone}`);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const getStatusBadge = (status: CustomerStatus) => {
    const statusConfig: Record<CustomerStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Ativo", variant: "default" },
      inactive: { label: "Inativo", variant: "secondary" },
      suspended: { label: "Suspenso", variant: "outline" },
      cancelled: { label: "Cancelado", variant: "destructive" },
    };
    const config = statusConfig[status] || statusConfig.inactive;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) setIsEditing(false); onOpenChange(o); }}>
      <SheetContent className="w-full sm:max-w-[700px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-xl">
              {isEditing ? (
                <Input
                  value={form.company_name}
                  onChange={(e) => updateField("company_name", e.target.value)}
                  className="text-xl font-semibold h-auto py-1"
                />
              ) : (
                customer.company_name
              )}
            </SheetTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge((isEditing ? form.status : customer.status) as CustomerStatus)}
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          </div>
          {!isEditing && customer.trading_name && (
            <p className="text-sm text-muted-foreground">{customer.trading_name}</p>
          )}
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">
              <Building2 className="h-4 w-4 mr-1" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="services">
              <Package className="h-4 w-4 mr-1" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <Receipt className="h-4 w-4 mr-1" />
              Faturas
            </TabsTrigger>
            <TabsTrigger value="contracts">
              <FileText className="h-4 w-4 mr-1" />
              Contratos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Métricas Financeiras */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">MRR</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(Number(customer.monthly_value || 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground">LTV</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(Number(customer.lifetime_value || 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Retenção */}
            {(customer as any).customer_since && (
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Cliente Desde</p>
                        <p className="text-sm font-bold">
                          {format(new Date((customer as any).customer_since), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Retenção</p>
                        <p className="text-sm font-bold">
                          {(() => {
                            const since = new Date((customer as any).customer_since);
                            const now = new Date();
                            const months = (now.getFullYear() - since.getFullYear()) * 12 + (now.getMonth() - since.getMonth());
                            if (months < 1) return "< 1 mês";
                            if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
                            const years = Math.floor(months / 12);
                            const rem = months % 12;
                            return rem > 0 ? `${years}a ${rem}m` : `${years} ${years === 1 ? "ano" : "anos"}`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Separator />

            {/* Contato */}
            <div className="space-y-3">
              <h4 className="font-semibold">Contato Principal</h4>
              <div className="grid gap-3">
                {isEditing ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Nome do Contato</label>
                      <Input value={form.contact_name} onChange={(e) => updateField("contact_name", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Telefone</label>
                      <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Email</label>
                      <Input value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.contact_name}</span>
                      {customer.position && (
                        <Badge variant="outline" className="ml-2">{customer.position}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.phone}</span>
                      <Button variant="outline" size="sm" className="h-7 px-2 ml-1" onClick={handleStartChat}>
                        <MessageCircle className="h-3.5 w-3.5 mr-1" />
                        Iniciar Conversa
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.email}</span>
                    </div>
                    {customer.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {customer.website}
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Dados da Empresa */}
            <div className="space-y-3">
              <h4 className="font-semibold">Dados da Empresa</h4>
              {isEditing ? (
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">CNPJ</label>
                    <Input value={form.cnpj} onChange={(e) => updateField("cnpj", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Segmento</label>
                    <Input value={form.segment} onChange={(e) => updateField("segment", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Cidade</label>
                      <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Estado</label>
                      <Input value={form.state} onChange={(e) => updateField("state", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Status</label>
                    <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                        <SelectItem value="suspended">Suspenso</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Data de Entrada (Cliente desde)</label>
                    <Input
                      type="date"
                      value={form.customer_since}
                      onChange={(e) => updateField("customer_since", e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 text-sm">
                  {customer.cnpj && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CNPJ:</span>
                      <span>{customer.cnpj}</span>
                    </div>
                  )}
                  {customer.segment && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Segmento:</span>
                      <Badge variant="outline">{customer.segment}</Badge>
                    </div>
                  )}
                  {customer.company_size && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Porte:</span>
                      <span>{customer.company_size}</span>
                    </div>
                  )}
                  {customer.employee_count && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Funcionários:</span>
                      <span>{customer.employee_count}</span>
                    </div>
                  )}
                  {customer.customer_since && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente desde:</span>
                      <span>{format(new Date(customer.customer_since), "dd/MM/yyyy")}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Endereço */}
            {!isEditing && (customer.street || customer.city) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </h4>
                  <p className="text-sm">
                    {[customer.street, customer.number, customer.complement, customer.neighborhood, customer.city, customer.state, customer.zip_code]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </>
            )}

            {/* Responsável */}
            {!isEditing && customer.account_manager_user && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-semibold">Responsável pela Conta</h4>
                  <p className="text-sm">{customer.account_manager_user.full_name}</p>
                </div>
              </>
            )}

            {/* Notas */}
            {isEditing ? (
              <>
                <Separator />
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Observações</label>
                  <Textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} />
                </div>
              </>
            ) : (
              customer.notes && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold">Observações</h4>
                    <p className="text-sm text-muted-foreground">{customer.notes}</p>
                  </div>
                </>
              )
            )}

            {/* Edit Footer */}
            {isEditing && (
              <>
                <Separator />
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Aba Serviços Contratados ─────────────────────────── */}
          <TabsContent value="services" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Serviços Contratados ({customerDeals.length})</h3>
              <Button size="sm" onClick={() => setShowNewService(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Serviço
              </Button>
            </div>

            {dealsLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
            ) : customerDeals.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum serviço registrado.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowNewService(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar primeiro serviço
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {customerDeals.map((deal) => {
                  const total = Number(deal.total_value) ||
                    (deal.deal_products || []).reduce((s, dp) => s + Number(dp.unit_price) * dp.quantity, 0);
                  const recurring = Number(deal.recurring_value) ||
                    (deal.deal_products || [])
                      .filter((dp) => dp.product?.is_recurring)
                      .reduce((s, dp) => s + Number(dp.unit_price) * dp.quantity, 0);

                  return (
                    <Card key={deal.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{deal.title}</p>
                            {deal.deal_products && deal.deal_products.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {deal.deal_products.map((dp) => (
                                  <Badge key={dp.id} variant="outline" className="text-xs">
                                    {dp.product?.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {deal.payment_terms && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Pagamento: {deal.payment_terms.toUpperCase()}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="text-right">
                              <p className="font-bold text-primary text-sm">
                                {formatCurrency(total)}
                              </p>
                              {recurring > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(recurring)}/mês
                                </p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => setEditingService(deal)}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <CustomerInvoicesTab customerId={customer.id} />
          </TabsContent>

          <TabsContent value="contracts" className="mt-4">
            <CustomerContractsTab customerId={customer.id} customerName={customer.company_name} />
          </TabsContent>
        </Tabs>
      </SheetContent>

      <NewServiceDialog
        open={showNewService}
        onOpenChange={setShowNewService}
        customerId={customer.id}
        customerName={customer.company_name}
        onSuccess={() => fetchDeals()}
      />

      {editingService && (
        <EditServiceDialog
          deal={editingService}
          open={!!editingService}
          onOpenChange={(o) => { if (!o) setEditingService(null); }}
          onSuccess={() => fetchDeals()}
        />
      )}
    </Sheet>
  );
}
