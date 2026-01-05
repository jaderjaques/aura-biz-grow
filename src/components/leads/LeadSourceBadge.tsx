import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, MessageCircle, FileSpreadsheet, Plug, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadSourceBadgeProps {
  source: string;
  className?: string;
}

const sourceConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  manual: {
    label: "Manual",
    icon: PenLine,
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  google_maps: {
    label: "Google Maps",
    icon: MapPin,
    className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
  website_form: {
    label: "Website",
    icon: Globe,
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  },
  csv_import: {
    label: "CSV",
    icon: FileSpreadsheet,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  api: {
    label: "API",
    icon: Plug,
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  },
};

export function LeadSourceBadge({ source, className }: LeadSourceBadgeProps) {
  const config = sourceConfig[source] || sourceConfig.manual;
  const Icon = config.icon;

  return (
    <Badge 
      variant="secondary" 
      className={cn("gap-1", config.className, className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
