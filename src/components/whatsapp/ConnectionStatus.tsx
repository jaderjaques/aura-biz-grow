import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  status: string;
  size?: "sm" | "md";
}

export function ConnectionStatus({ status, size = "md" }: ConnectionStatusProps) {
  const isConnected = status === "connected";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        isConnected
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-muted text-muted-foreground border-border"
      )}
    >
      {isConnected ? (
        <Wifi className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      ) : (
        <WifiOff className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      )}
      {isConnected ? "Conectado" : "Desconectado"}
    </span>
  );
}
