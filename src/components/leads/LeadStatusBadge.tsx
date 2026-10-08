import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LeadStatusBadgeProps {
  status: string;
  // Nome da etapa do funil do tenant (ex.: "Qualificando"); quando existe, é o que aparece no selo.
  label?: string | null;
  className?: string;
}

const azul = "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
const amarelo = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300";
const verde = "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
const vermelho = "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300";
const roxo = "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300";
const cinza = "bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-300";

// Todos os valores que leads.status aceita (constraint do banco), em português e em inglês.
const statusConfig: Record<string, { label: string; className: string }> = {
  novo: { label: "Novo", className: azul },
  new: { label: "Novo", className: azul },
  contatado: { label: "Contatado", className: amarelo },
  contacted: { label: "Contatado", className: amarelo },
  em_analise: { label: "Em Análise", className: amarelo },
  qualificado: { label: "Qualificado ✓", className: verde },
  qualified: { label: "Qualificado ✓", className: verde },
  proposta: { label: "Proposta", className: roxo },
  ganho: { label: "Ganho", className: verde },
  converted: { label: "Convertido", className: verde },
  perdido: { label: "Perdido", className: vermelho },
  lost: { label: "Perdido", className: vermelho },
  descartado: { label: "Descartado", className: vermelho },
  active: { label: "Ativo", className: azul },
  inactive: { label: "Inativo", className: cinza },
};

export function LeadStatusBadge({ status, label, className }: LeadStatusBadgeProps) {
  const config = statusConfig[status] || { label: status || "Novo", className: cinza };

  return (
    <Badge
      variant="secondary"
      className={cn(config.className, className)}
    >
      {label || config.label}
    </Badge>
  );
}
