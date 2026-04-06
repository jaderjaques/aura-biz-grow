import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Stethoscope, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Consultorio {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  tenant_id: string;
  created_at: string;
}

const EMPTY = { name: "", description: "" };

export default function Consultorios() {
  const [consultorios, setConsultorios] = useState<Consultorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Consultorio | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("consultorios")
      .select("*")
      .order("name");
    setConsultorios(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setDialogOpen(true);
  };

  const openEdit = (c: Consultorio) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description ?? "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Informe o nome do consultório."); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("consultorios")
          .update({ name: form.name, description: form.description || null })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Consultório atualizado!");
      } else {
        const { error } = await supabase
          .from("consultorios")
          .insert({ name: form.name, description: form.description || null, active: true });
        if (error) throw error;
        toast.success("Consultório criado!");
      }
      setDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from("consultorios").update({ active }).eq("id", id);
    setConsultorios(prev => prev.map(c => c.id === id ? { ...c, active } : c));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("consultorios").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir."); return; }
    toast.success("Consultório excluído.");
    fetchAll();
  };

  const ativos = consultorios.filter(c => c.active).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Consultórios</h1>
            <p className="text-muted-foreground">
              {consultorios.length} consultório{consultorios.length !== 1 ? "s" : ""} cadastrado{consultorios.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo consultório
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Total", value: consultorios.length, icon: Stethoscope, color: "text-primary" },
            { label: "Ativos", value: ativos, icon: Users, color: "text-green-600" },
            { label: "Inativos", value: consultorios.length - ativos, icon: Stethoscope, color: "text-muted-foreground" },
          ].map(kpi => (
            <Card key={kpi.label}>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
                <div>
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : consultorios.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Nenhum consultório cadastrado</p>
            <p className="text-sm mt-1">Clique em "Novo consultório" para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {consultorios.map(c => (
              <Card key={c.id} className={!c.active ? "opacity-60" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Stethoscope className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold truncate">{c.name}</p>
                          {c.description && (
                            <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant={c.active ? "default" : "secondary"} className="text-xs shrink-0">
                      {c.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={c.active}
                        onCheckedChange={(v) => handleToggleActive(c.id, v)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {c.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir consultório?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O consultório <strong>{c.name}</strong> será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => handleDelete(c.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar consultório" : "Novo consultório"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Consultório 01"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Sala de raio-X, cadeira hidráulica..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
