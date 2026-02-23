import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Alert {
  id: string;
  contact_name: string | null;
  escalation_reason: string | null;
}

interface EscalationAlertProps {
  onGoToChat?: (chatId: string) => void;
}

export function EscalationAlert({ onGoToChat }: EscalationAlertProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel("escalation-alerts")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chats",
        },
        (payload) => {
          const newChat = payload.new as any;
          if (newChat.needs_human && !newChat.assumed_by) {
            const alert: Alert = {
              id: newChat.id,
              contact_name: newChat.contact_name,
              escalation_reason: newChat.escalation_reason,
            };

            setAlerts((prev) => {
              if (prev.some((a) => a.id === alert.id)) return prev;
              return [...prev, alert];
            });

            // Auto-remove after 30s
            setTimeout(() => {
              setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
            }, 30000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="w-80 p-4 bg-destructive text-destructive-foreground rounded-lg shadow-2xl border-2 border-destructive animate-in slide-in-from-right"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm mb-1">ATENDIMENTO URGENTE</h4>
              <p className="font-medium text-sm truncate">{alert.contact_name || "Cliente"}</p>
              {alert.escalation_reason && (
                <p className="text-xs opacity-90 mt-0.5">{alert.escalation_reason}</p>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="w-full mt-2"
                onClick={() => {
                  onGoToChat?.(alert.id);
                  setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
                }}
              >
                Assumir Agora
              </Button>
            </div>
            <button
              onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
              className="opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
