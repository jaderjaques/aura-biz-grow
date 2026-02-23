import { MessageSquare } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
        <MessageSquare className="h-10 w-10" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Selecione uma conversa
        </h3>
        <p className="text-sm max-w-xs">
          Escolha uma conversa na lista ao lado para visualizar as mensagens
        </p>
      </div>
    </div>
  );
}
