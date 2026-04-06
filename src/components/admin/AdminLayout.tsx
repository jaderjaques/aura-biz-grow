import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, ArrowLeft, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/empresas", label: "Empresas", icon: Building2, exact: false },
];

function AdminNav() {
  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.exact}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-white/10 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex">
      {/* Admin Sidebar */}
      <aside className="w-60 bg-gray-900 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-amber-400" />
            <span className="text-white font-bold text-sm tracking-wide">MASTER ADMIN</span>
          </div>
          <p className="text-white/40 text-xs">Gestão de contratos SaaS</p>
        </div>

        {/* Nav */}
        <div className="flex-1 p-3">
          <AdminNav />
        </div>

        <Separator className="bg-white/10" />

        {/* Back to CRM */}
        <div className="p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao CRM
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}
