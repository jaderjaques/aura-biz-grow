import { cn } from "@/lib/utils";
import { Flame, Droplets, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LeadScoreBadgeProps {
  score: number;
  grade?: "hot" | "warm" | "cold";
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  className?: string;
}

function getGradeFromScore(score: number): "hot" | "warm" | "cold" {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

const gradeConfig = {
  hot: {
    label: "Quente",
    icon: Flame,
    className: "bg-destructive text-destructive-foreground",
  },
  warm: {
    label: "Morno",
    icon: Droplets,
    className: "bg-yellow-500 text-white dark:bg-yellow-600",
  },
  cold: {
    label: "Frio",
    icon: Snowflake,
    className: "bg-blue-500 text-white dark:bg-blue-600",
  },
};

const sizeClasses = {
  sm: "text-xs py-0.5 px-2",
  md: "text-sm py-1 px-3",
  lg: "text-base py-1.5 px-4",
};

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function LeadScoreBadge({
  score,
  grade,
  size = "md",
  showScore = true,
  className,
}: LeadScoreBadgeProps) {
  const resolvedGrade = grade || getGradeFromScore(score);
  const config = gradeConfig[resolvedGrade];
  const Icon = config.icon;

  return (
    <Badge
      className={cn(
        config.className,
        sizeClasses[size],
        "flex items-center gap-1.5",
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      <span className="font-semibold">{config.label}</span>
      {showScore && (
        <>
          <span className="opacity-75">•</span>
          <span className="font-bold">{score}</span>
        </>
      )}
    </Badge>
  );
}
