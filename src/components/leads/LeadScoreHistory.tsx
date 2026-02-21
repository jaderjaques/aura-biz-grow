import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LeadScoreBadge } from "./LeadScoreBadge";
import { TrendingUp, TrendingDown, Minus, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScoreHistoryEntry {
  id: string;
  old_score: number | null;
  new_score: number | null;
  old_grade: string | null;
  new_grade: string | null;
  reason: string | null;
  created_at: string;
}

interface LeadScoreHistoryProps {
  leadId: string;
  currentScore: number;
  currentGrade: "hot" | "warm" | "cold";
}

function getGradeLabel(grade: string | null) {
  const labels: Record<string, string> = {
    hot: "Quente",
    warm: "Morno",
    cold: "Frio",
  };
  return labels[grade || ""] || grade || "—";
}

export function LeadScoreHistory({ leadId, currentScore, currentGrade }: LeadScoreHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("lead_score_history")
          .select("*")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        setHistory(data || []);
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [leadId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Score
          </CardTitle>
          <LeadScoreBadge score={currentScore} grade={currentGrade} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma mudança registrada
          </p>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-3">
              {history.map((item) => {
                const scoreDiff = (item.new_score || 0) - (item.old_score || 0);
                const isIncrease = scoreDiff > 0;

                return (
                  <div key={item.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5">
                      {isIncrease ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : scoreDiff < 0 ? (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      ) : (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={isIncrease ? "text-green-600 font-medium" : scoreDiff < 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                          {isIncrease ? "+" : ""}{scoreDiff} pts
                        </span>
                        <span className="text-muted-foreground">
                          {item.old_score ?? 0} → {item.new_score ?? 0}
                        </span>
                      </div>
                      {item.old_grade !== item.new_grade && (
                        <p className="text-xs text-muted-foreground">
                          {getGradeLabel(item.old_grade)} → {getGradeLabel(item.new_grade)}
                        </p>
                      )}
                      {item.reason && (
                        <p className="text-xs text-muted-foreground truncate">{item.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
