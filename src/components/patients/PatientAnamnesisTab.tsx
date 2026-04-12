import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface AnamnesisRecord {
  id: string;
  created_at: string;
  content: {
    template_name?: string;
    answers?: Record<string, unknown>;
  };
}

interface PatientAnamnesisTabProps {
  patientId: string;
}

export function PatientAnamnesisTab({ patientId }: PatientAnamnesisTabProps) {
  const [records, setRecords] = useState<AnamnesisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("medical_records")
        .select("id, created_at, content")
        .eq("patient_id", patientId)
        .eq("record_type", "anamnesis")
        .order("created_at", { ascending: false });

      setRecords((data as AnamnesisRecord[]) ?? []);
      // Open the most recent one by default
      if (data && data.length > 0) {
        setOpenIds(new Set([data[0].id]));
      }
      setLoading(false);
    };
    fetch();
  }, [patientId]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Carregando...
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Nenhuma ficha de anamnese registrada para este paciente.
        </p>
        <p className="text-xs text-muted-foreground">
          Adicione uma anamnese na aba Prontuário.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => {
        const { answers, template_name } = record.content ?? {};
        const isOpen = openIds.has(record.id);

        return (
          <Card key={record.id} className="overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={() => toggle(record.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">
                          {template_name ?? "Anamnese"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(record.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <Separator />
                <CardContent className="pt-3 pb-4 px-4">
                  {answers && Object.keys(answers).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(answers).map(([label, value]) => {
                        const formatted = formatValue(value);
                        const isAlert =
                          typeof value === "boolean"
                            ? value === true &&
                              /alerg|medica|pressão|diabetes|cardía|gestante|fumante/i.test(label)
                            : false;

                        return (
                          <div key={label} className="grid grid-cols-[1fr_auto] gap-2 items-start py-1 border-b border-border/40 last:border-0">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className={`text-xs font-medium text-right max-w-[200px] ${isAlert ? "text-destructive" : ""}`}>
                              {isAlert && (
                                <Badge variant="destructive" className="mr-1 text-[10px] py-0 h-4">!</Badge>
                              )}
                              {formatted}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem respostas registradas.</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}
