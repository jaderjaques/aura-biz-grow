import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconClassName?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel = "vs período anterior",
  icon: Icon,
  iconClassName
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {Icon && (
            <Icon className={cn("h-5 w-5 text-muted-foreground", iconClassName)} />
          )}
        </div>
        <p className="text-2xl font-bold mt-2">{value}</p>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-2 text-sm">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className={cn(
              "font-medium",
              isPositive ? "text-emerald-500" : "text-red-500"
            )}>
              {isPositive ? "+" : ""}{change}%
            </span>
            <span className="text-muted-foreground">{changeLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
