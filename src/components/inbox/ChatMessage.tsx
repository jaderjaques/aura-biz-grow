import { format } from "date-fns";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Record<string, any>;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isIncoming = message.direction === "incoming";
  const sentByAI = (message as any).ai_generated === true ||
    (message.metadata as Record<string, unknown> | null)?.sent_by_ai === true;

  return (
    <div className={cn("flex", isIncoming ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
          isIncoming
            ? "bg-card text-card-foreground rounded-tl-sm"
            : "bg-primary text-primary-foreground rounded-tr-sm"
        )}
      >
        {!isIncoming && sentByAI && (
          <div className="flex items-center gap-1 mb-1 text-xs opacity-80">
            <Bot className="h-3 w-3" />
            <span>Enviado pela IA</span>
          </div>
        )}

        {/* Media */}
        {message.message_type === "image" && message.media_url && (
          <img
            src={message.media_url}
            alt="Imagem"
            className="rounded-lg mb-2 max-w-full"
            loading="lazy"
          />
        )}

        {message.message_type === "audio" && message.media_url && (
          <audio controls className="mb-2 max-w-full">
            <source src={message.media_url} />
          </audio>
        )}

        {message.message_type === "document" && message.media_url && (
          <a
            href={message.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 mb-2 underline text-sm",
              isIncoming ? "text-primary" : "text-primary-foreground"
            )}
          >
            📎 {message.media_filename || "Documento"}
          </a>
        )}

        {/* Text content */}
        {message.content && (
          <div className="whitespace-pre-wrap break-words text-sm">
            {message.content}
          </div>
        )}

        {message.caption && !message.content && (
          <div className="whitespace-pre-wrap break-words text-sm">
            {message.caption}
          </div>
        )}

        <div
          className={cn(
            "text-[10px] mt-1 text-right",
            isIncoming ? "text-muted-foreground" : "text-primary-foreground/70"
          )}
        >
          {message.created_at && format(new Date(message.created_at), "HH:mm")}
        </div>
      </div>
    </div>
  );
}
