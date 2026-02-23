import { Badge } from "@/components/ui/badge";
import { Bot, User, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIStatusBadgeProps {
  aiMode: string | null;
  needsHuman: boolean | null;
  assumedBy: string | null;
  className?: string;
}

export function AIStatusBadge({ aiMode, needsHuman, assumedBy, className }: AIStatusBadgeProps) {
  if (needsHuman && !assumedBy) {
    return (
      <Badge className={cn("bg-destructive text-destructive-foreground animate-pulse text-[10px] px-1.5", className)}>
        <AlertTriangle className="h-3 w-3 mr-0.5" />
        URGENTE
      </Badge>
    );
  }

  if (assumedBy) {
    return (
      <Badge variant="outline" className={cn("text-[10px] px-1.5 border-blue-400 text-blue-600", className)}>
        <User className="h-3 w-3 mr-0.5" />
        Humano
      </Badge>
    );
  }

  if (aiMode === "auto") {
    return (
      <Badge variant="outline" className={cn("text-[10px] px-1.5 border-green-400 text-green-600", className)}>
        <Bot className="h-3 w-3 mr-0.5" />
        IA
      </Badge>
    );
  }

  return null;
}
