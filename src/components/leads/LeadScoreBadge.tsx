import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

interface LeadScoreBadgeProps {
  score: number;
  className?: string;
}

export function LeadScoreBadge({ score, className }: LeadScoreBadgeProps) {
  const getScoreColor = () => {
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-gray-500 dark:text-gray-400";
  };

  const getFlameColor = () => {
    if (score >= 70) return "text-orange-500";
    if (score >= 40) return "text-yellow-500";
    return "text-gray-400";
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Flame className={cn("h-4 w-4", getFlameColor())} />
      <span className={cn("font-medium", getScoreColor())}>{score}</span>
    </div>
  );
}
