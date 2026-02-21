import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, Target } from 'lucide-react';

interface BANTScoreBadgeProps {
  score: number;
  qualified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function BANTScoreBadge({ score, qualified = false, size = 'md', showLabel = true }: BANTScoreBadgeProps) {
  const getConfig = () => {
    if (qualified || score >= 75) {
      return {
        label: 'BANT Qualificado',
        shortLabel: 'Qualificado',
        icon: CheckCircle,
        className: 'bg-green-600 hover:bg-green-700 text-white',
      };
    } else if (score >= 60) {
      return {
        label: 'BANT Parcial',
        shortLabel: 'Parcial',
        icon: Target,
        className: 'bg-blue-600 hover:bg-blue-700 text-white',
      };
    } else if (score >= 40) {
      return {
        label: 'BANT Baixo',
        shortLabel: 'Baixo',
        icon: AlertTriangle,
        className: 'bg-amber-500 hover:bg-amber-600 text-white',
      };
    } else {
      return {
        label: 'BANT Não Qualif.',
        shortLabel: 'N/Q',
        icon: XCircle,
        className: 'bg-muted text-muted-foreground',
      };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs py-0.5 px-2',
    md: 'text-sm py-1 px-3',
    lg: 'text-base py-1.5 px-4',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge className={`${config.className} ${sizeClasses[size]} flex items-center gap-1.5`}>
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{size === 'sm' ? config.shortLabel : config.label}</span>}
      <span className="opacity-75">•</span>
      <span className="font-bold">{score}</span>
    </Badge>
  );
}
