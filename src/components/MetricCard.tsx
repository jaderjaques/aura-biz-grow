import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  iconColor?: "primary" | "secondary" | "success" | "info";
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const iconColorClasses = {
  primary: "text-primary",
  secondary: "text-secondary",
  success: "text-success",
  info: "text-info",
};

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "primary",
  trend,
}: MetricCardProps) {
  return (
    <Card className="metric-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn("h-4 w-4", iconColorClasses[iconColor])} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p
            className={cn(
              "text-xs mt-1",
              trend.isPositive ? "text-success" : "text-destructive"
            )}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}% desde o mês passado
          </p>
        )}
      </CardContent>
    </Card>
  );
}
