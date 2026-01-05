import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  Users, 
  Briefcase, 
  BarChart3, 
  ClipboardList, 
  FileBarChart, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  UserPlus,
  FileText,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  adminOnly?: boolean;
  comingSoon?: boolean;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  { title: "Leads", href: "/leads", icon: Users },
  { title: "Propostas", href: "/propostas", icon: FileText },
  { title: "Clientes", href: "/clientes", icon: Briefcase },
  { title: "Tarefas", href: "/tarefas", icon: ClipboardList, comingSoon: true },
  { title: "Relatórios", href: "/relatorios", icon: FileBarChart, comingSoon: true },
  { title: "Produtos", href: "/configuracoes/produtos", icon: Package, adminOnly: true },
  { title: "Usuários", href: "/configuracoes/usuarios", icon: UserPlus, adminOnly: true },
  { title: "Configurações", href: "/configuracoes", icon: Settings, adminOnly: true },
];

interface SidebarContentProps {
  collapsed: boolean;
  onCollapse?: () => void;
  isMobile?: boolean;
}

function SidebarNavContent({ collapsed, onCollapse, isMobile = false }: SidebarContentProps) {
  const location = useLocation();
  const { profile, isAdmin, signOut } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || (item.adminOnly && isAdmin)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <Logo collapsed={collapsed && !isMobile} />
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onCollapse}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
          
          const linkContent = (
            <NavLink
              to={item.comingSoon ? "#" : item.href}
              className={cn(
                "sidebar-item group relative",
                isActive && "sidebar-item-active",
                item.comingSoon && "opacity-60 cursor-not-allowed"
              )}
              onClick={(e) => item.comingSoon && e.preventDefault()}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {(!collapsed || isMobile) && (
                <>
                  <span className="flex-1 truncate">{item.title}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                  {item.comingSoon && (
                    <Badge variant="outline" className="ml-auto text-[10px] px-1.5">
                      Em breve
                    </Badge>
                  )}
                </>
              )}
            </NavLink>
          );

          if (collapsed && !isMobile) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="flex items-center gap-2">
                  {item.title}
                  {item.comingSoon && (
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      Em breve
                    </Badge>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>

      <Separator />

      {/* User Section */}
      <div className="p-3">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg",
            collapsed && !isMobile ? "justify-center" : ""
          )}
        >
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="gradient-bg text-primary-foreground text-xs">
              {profile?.full_name ? getInitials(profile.full_name) : "U"}
            </AvatarFallback>
          </Avatar>
          {(!collapsed || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.full_name || "Usuário"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.role?.name || "Carregando..."}
              </p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          className={cn(
            "w-full mt-2 text-muted-foreground hover:text-destructive",
            collapsed && !isMobile ? "px-0" : "justify-start"
          )}
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {(!collapsed || isMobile) && <span className="ml-2">Sair</span>}
        </Button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-3 left-3 z-50"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <SidebarNavContent collapsed={false} isMobile />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarNavContent
          collapsed={collapsed}
          onCollapse={() => setCollapsed(!collapsed)}
        />
      </aside>
    </>
  );
}
