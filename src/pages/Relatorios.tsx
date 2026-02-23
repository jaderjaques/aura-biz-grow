import { AppLayout } from "@/components/layout/AppLayout";
import { BarChart3 } from "lucide-react";

export default function RelatoriosPage() {
  return (
    <AppLayout>
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Módulo de relatórios em desenvolvimento</p>
        </div>
      </div>
    </AppLayout>
  );
}
