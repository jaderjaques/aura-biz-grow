import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface AppLayoutProps {
  children: React.ReactNode;
}

// A altura é a da janela: só o conteúdo rola e o cabeçalho (com o botão do menu no celular) fica sempre visível.
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
        <AppHeader />
        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
