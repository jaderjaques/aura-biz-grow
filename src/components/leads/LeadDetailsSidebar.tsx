import { useState, useEffect, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { LeadSourceBadge } from "./LeadSourceBadge";
import { LeadScoreBadge } from "./LeadScoreBadge";
import { LeadScoreHistory } from "./LeadScoreHistory";
import { BANTQualification } from "./BANTQualification";
import { BANTScoreBadge } from "./BANTScoreBadge";
import { Lead, Activity, StageHistory } from "@/types/leads";
import { useLeadActivities } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import {
  MoreVertical,
  Edit,
  UserCheck,
  Trash2,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  ExternalLink,
  ArrowRight,
  Plus,
  PhoneCall,
  FileText,
  Video,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { AddActivityDialog } from "./AddActivityDialog";
import { LeadTagSelector } from "./LeadTagSelector";

interface LeadDetailsSidebarProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onCreateDeal?: (lead: Lead) => void;
  onUpdateLead?: (id: string, data: Record<string, unknown>) => Promise<any>;
}

export function LeadDetailsSidebar({
  leadId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onRefresh,
  onCreateDeal,
  onUpdateLead,
}: LeadDetailsSidebarProps) {
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    source: "",
    status: "",
    estimated_value: "",
    notes: "",
  });
  const { activities, history, createActivity, fetchActivities, fetchHistory } = useLeadActivities(leadId);

  useEffect(() => {
    const fetchLead = async () => {
      if (!leadId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("leads")
          .select(`
            *,
            assigned_user:profiles!leads_assigned_to_fkey(id, full_name, avatar_url)
          `)
          .eq("id", leadId)
          .single();

        if (error) throw error;

        // Mark as viewed
        if (!data.viewed_at) {
          await supabase
            .from("leads")
            .update({ viewed_at: new Date().toISOString() })
            .eq("id", leadId);
        }

        // Fetch tags
        const { data: leadTags } = await supabase
          .from("lead_tags")
          .select("tags(*)")
          .eq("lead_id", leadId);

        setLead({
          ...data,
          tags: leadTags?.map((lt) => lt.tags) || [],
        } as Lead);
      } catch (error) {
        console.error("Error fetching lead:", error);
      } finally {
        setLoading(false);
      }
    };

    if (open && leadId) {
      fetchLead();
    }
  }, [leadId, open]);

  const formatCurrency = (value: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call":
        return <PhoneCall className="h-4 w-4 text-blue-500" />;
      case "email":
        return <Mail className="h-4 w-4 text-purple-500" />;
      case "whatsapp":
        return <MessageCircle className="h-4 w-4 text-green-500" />;
      case "meeting":
        return <Video className="h-4 w-4 text-orange-500" />;
      case "note":
        return <FileText className="h-4 w-4 text-gray-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleActivityCreated = () => {
    fetchActivities();
    setShowActivityDialog(false);
  };

  const startEditing = () => {
    if (!lead) return;
    setEditForm({
      company_name: lead.company_name || "",
      contact_name: lead.contact_name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      source: lead.source || "manual",
      status: lead.status || "novo",
      estimated_value: lead.estimated_value ? String(lead.estimated_value) : "",
      notes: lead.notes || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => setIsEditing(false);

  const handleSaveEdit = async () => {
    if (!lead || !onUpdateLead) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        company_name: editForm.company_name,
        contact_name: editForm.contact_name || null,
        email: editForm.email || null,
        phone: editForm.phone,
        source: editForm.source,
        status: editForm.status,
        estimated_value: editForm.estimated_value ? Number(editForm.estimated_value) : null,
        notes: editForm.notes || null,
      };
      await onUpdateLead(lead.id, updates);
      // Refetch lead
      const { data } = await supabase
        .from("leads")
        .select("*, assigned_user:profiles!leads_assigned_to_fkey(id, full_name, avatar_url)")
        .eq("id", lead.id)
        .single();
      if (data) setLead(data as Lead);
      setIsEditing(false);
      onRefresh();
    } catch {
      // toast handled by hook
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) =>
    setEditForm((prev) => ({ ...prev, [field]: value }));

  if (!lead) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => { if (!o) setIsEditing(false); onOpenChange(o); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
          <SheetHeader className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-2xl">{lead.company_name}</SheetTitle>
                <SheetDescription>{lead.phone}</SheetDescription>
              </div>

              <div className="flex items-center gap-2">
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Converter em Cliente
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        onDelete(lead.id);
                        onOpenChange(false);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Status e Score */}
            <div className="flex flex-wrap items-center gap-3">
              <LeadStatusBadge status={lead.status} />
              <LeadScoreBadge
                score={lead.lead_score}
                grade={lead.score_grade as "hot" | "warm" | "cold" | undefined}
              />
              <LeadSourceBadge source={lead.source} />
              {(lead.bant_score != null && lead.bant_score > 0) && (
                <BANTScoreBadge
                  score={lead.bant_score}
                  qualified={lead.bant_qualified || false}
                  size="sm"
                />
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <LeadTagSelector
                leadId={lead.id}
                currentTags={lead.tags || []}
                onUpdate={() => {
                  onRefresh();
                }}
              />
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 mt-6">
            <Tabs defaultValue="overview" className="h-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="bant">BANT</TabsTrigger>
                <TabsTrigger value="activities">Atividades</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>

              {/* Tab: Visão Geral */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Create Deal Button */}
                {onCreateDeal && (
                  <Button
                    onClick={() => onCreateDeal(lead)}
                    className="w-full bg-gradient-to-r from-primary to-accent"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Criar Proposta
                  </Button>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-4 gap-2">
                  <Button variant="outline" size="sm" className="flex-col h-auto py-3" asChild>
                    <a href={`tel:${lead.phone}`}>
                      <Phone className="h-4 w-4 mb-1" />
                      <span className="text-xs">Ligar</span>
                    </a>
                  </Button>
                  {lead.email && (
                    <Button variant="outline" size="sm" className="flex-col h-auto py-3" asChild>
                      <a href={`mailto:${lead.email}`}>
                        <Mail className="h-4 w-4 mb-1" />
                        <span className="text-xs">Email</span>
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="flex-col h-auto py-3" asChild>
                    <a
                      href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4 mb-1" />
                      <span className="text-xs">WhatsApp</span>
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-col h-auto py-3"
                    onClick={() => setShowActivityDialog(true)}
                  >
                    <Calendar className="h-4 w-4 mb-1" />
                    <span className="text-xs">Agendar</span>
                  </Button>
                </div>

                {/* Info Cards */}
                {isEditing ? (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Editar Informações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Empresa</label>
                        <Input value={editForm.company_name} onChange={(e) => updateField("company_name", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Contato</label>
                        <Input value={editForm.contact_name} onChange={(e) => updateField("contact_name", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Email</label>
                        <Input value={editForm.email} onChange={(e) => updateField("email", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Telefone</label>
                        <Input value={editForm.phone} onChange={(e) => updateField("phone", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Origem</label>
                        <Select value={editForm.source} onValueChange={(v) => updateField("source", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="website">Website</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="indicacao">Indicação</SelectItem>
                            <SelectItem value="csv_import">CSV Import</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Status</label>
                        <Select value={editForm.status} onValueChange={(v) => updateField("status", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="novo">Novo</SelectItem>
                            <SelectItem value="contatado">Contatado</SelectItem>
                            <SelectItem value="qualificado">Qualificado</SelectItem>
                            <SelectItem value="proposta">Proposta</SelectItem>
                            <SelectItem value="negociacao">Negociação</SelectItem>
                            <SelectItem value="ganho">Ganho</SelectItem>
                            <SelectItem value="perdido">Perdido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Valor Estimado</label>
                        <Input type="number" value={editForm.estimated_value} onChange={(e) => updateField("estimated_value", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Observações</label>
                        <Textarea value={editForm.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} />
                      </div>
                      <Separator />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={saving}>
                          <Save className="h-4 w-4 mr-1" />
                          {saving ? "Salvando..." : "Salvar"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Informações</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        {lead.contact_name && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Contato:</span>
                            <span className="font-medium">{lead.contact_name}</span>
                          </div>
                        )}
                        {lead.position && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cargo:</span>
                            <span className="font-medium">{lead.position}</span>
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                              {lead.email}
                            </a>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Telefone:</span>
                          <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                            {lead.phone}
                          </a>
                        </div>
                        {lead.cnpj && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">CNPJ:</span>
                            <span className="font-medium">{lead.cnpj}</span>
                          </div>
                        )}
                        {lead.segment && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Segmento:</span>
                            <Badge variant="outline">{lead.segment}</Badge>
                          </div>
                        )}
                        {lead.website && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Website:</span>
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {lead.website.replace(/^https?:\/\//, "")}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                        {lead.instagram && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Instagram:</span>
                            <a
                              href={`https://instagram.com/${lead.instagram.replace("@", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {lead.instagram}
                            </a>
                          </div>
                        )}
                        {lead.estimated_value && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Valor Estimado:</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(lead.estimated_value)}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Notes */}
                    {lead.notes && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm">Notas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{lead.notes}</p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {/* Score History */}
                <LeadScoreHistory
                  leadId={lead.id}
                  currentScore={lead.lead_score || 0}
                  currentGrade={(lead.score_grade as "hot" | "warm" | "cold") || "cold"}
                />

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Rastreamento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Criado em:</span>
                      <span>
                        {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    {lead.first_contact_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Primeiro contato:</span>
                        <span>
                          {format(new Date(lead.first_contact_at), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    )}
                    {lead.last_contact_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Último contato:</span>
                        <span>
                          {formatDistanceToNow(new Date(lead.last_contact_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    )}
                    {lead.assigned_user && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Responsável:</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={lead.assigned_user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {lead.assigned_user.full_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span>{lead.assigned_user.full_name}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: BANT */}
              <TabsContent value="bant" className="mt-4">
                <BANTQualification
                  lead={lead}
                  onUpdate={() => {
                    // Refetch lead data
                    const refetch = async () => {
                      const { data } = await supabase
                        .from("leads")
                        .select("*, assigned_user:profiles!leads_assigned_to_fkey(id, full_name, avatar_url)")
                        .eq("id", lead.id)
                        .single();
                      if (data) setLead(data as Lead);
                    };
                    refetch();
                    onRefresh();
                  }}
                />
              </TabsContent>

              {/* Tab: Atividades */}
              <TabsContent value="activities" className="mt-4">
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowActivityDialog(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Atividade
                  </Button>

                  {activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma atividade registrada
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <Card key={activity.id}>
                          <CardContent className="py-3">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">{getActivityIcon(activity.activity_type)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{activity.title}</p>
                                {activity.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {activity.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  {activity.created_by_user && (
                                    <>
                                      <Avatar className="h-4 w-4">
                                        <AvatarFallback className="text-[8px]">
                                          {activity.created_by_user.full_name[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>{activity.created_by_user.full_name}</span>
                                      <span>•</span>
                                    </>
                                  )}
                                  <span>
                                    {formatDistanceToNow(new Date(activity.created_at), {
                                      addSuffix: true,
                                      locale: ptBR,
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab: Histórico */}
              <TabsContent value="history" className="mt-4">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma movimentação registrada
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className="mt-1">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            Movido de{" "}
                            <span className="font-medium">{item.from_stage}</span> para{" "}
                            <span className="font-medium">{item.to_stage}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.changed_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AddActivityDialog
        open={showActivityDialog}
        onOpenChange={setShowActivityDialog}
        leadId={leadId}
        onSuccess={handleActivityCreated}
      />
    </>
  );
}
