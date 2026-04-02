import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  UserPlus,
  FileText,
  Package,
  DollarSign,
  Receipt,
  Sparkles,
  MessageCircle,
  CalendarDays,
  Smartphone,
  Plug,
  ClipboardList,
  Users,
  FileBarChart,
  Briefcase,
  Settings,
  GitBranch,
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
import { SidebarSection } from "./SidebarSection";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  adminOnly?: boolean;
}

const topLevelItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  { title: "Mavie IA", href: "/mavie", icon: Sparkles },
  { title: "Inbox", href: "/inbox", icon: MessageCircle },
];

const financeiroItems: NavItem[] = [
  { title: "Visão Geral", href: "/financeiro", icon: DollarSign },
  { title: "Faturas", href: "/faturas", icon: Receipt },
  { title: "Relatórios", href: "/relatorios", icon: FileBarChart },
];

const vendasItems: NavItem[] = [
  { title: "Leads", href: "/leads", icon: Users },
  { title: "Propostas", href: "/propostas", icon: FileText },
  { title: "Clientes", href: "/clientes", icon: Briefcase },
  { title: "Agenda", href: "/agenda", icon: CalendarDays },
  { title: "Tarefas", href: "/tarefas", icon: ClipboardList },
];

const configItems: NavItem[] = [
  { title: "Usuários", href: "/configuracoes/usuarios", icon: UserPlus, adminOnly: true },
  { title: "Produtos/Serviços", href: "/configuracoes/produtos", icon: Package, adminOnly: true },
  { title: "Geral", href: "/configuracoes", icon: Settings, adminOnly: true },
];

const integracoesItems: NavItem[] = [
  { title: "WhatsApp", href: "/configuracoes/whatsapp", icon: Smartphone, adminOnly: true },
  { title: "Google Calendar", href: "/google-calendar", icon: CalendarDays },
  { title: "API Keys", href: "/configuracoes/integracoes", icon: Plug, adminOnly: true },
];

interface SidebarContentProps {
  collapsed: boolean;
  onCollapse?: () => void;
  isMobile?: boolean;
}

function NavItemLink({
  item,
  collapsed,
  isMobile,
}: {
  item: NavItem;
  collapsed: boolean;
  isMobile: boolean;
}) {
  const location = useLocation();
  const isActive =
    location.pathname === item.href ||
    (item.href !== "/dashboard" &&
      item.href !== "/financeiro" &&
      item.href !== "/configuracoes" &&
      location.pathname.startsWith(item.href));

  const linkContent = (
    <NavLink
      to={item.href}
      className={cn(
        "sidebar-item group relative",
        isActive && "sidebar-item-active"
      )}
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
        </>
      )}
    </NavLink>
  );

  if (collapsed && !isMobile) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

function renderSection(
  icon: React.ElementType,
  label: string,
  items: NavItem[],
  isAdmin: boolean,
  collapsed: boolean,
  isMobile: boolean
) {
  const filtered = items.filter((i) => !i.adminOnly || isAdmin);
  if (filtered.length === 0) return null;

  if (collapsed && !isMobile) {
    return filtered.map((item) => (
      <NavItemLink
        key={item.href}
        item={item}
        collapsed={collapsed}
        isMobile={isMobile}
      />
    ));
  }

  return (
    <SidebarSection
      icon={icon}
      label={label}
      collapsed={collapsed}
      isMobile={isMobile}
    >
      {filtered.map((item) => (
        <NavItemLink
          key={item.href}
          item={item}
          collapsed={collapsed}
          isMobile={isMobile}
        />
      ))}
    </SidebarSection>
  );
}

function SidebarNavContent({ collapsed, onCollapse, isMobile = false }: SidebarContentProps) {
  const { profile, isAdmin, signOut } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
        {/* Top-level items */}
        {topLevelItems.map((item) => (
          <NavItemLink
            key={item.href}
            item={item}
            collapsed={collapsed && !isMobile}
            isMobile={!!isMobile}
          />
        ))}

        <Separator className="my-2" />

        {/* Financeiro */}
        {renderSection(DollarSign, "Financeiro", financeiroItems, !!isAdmin, collapsed && !isMobile, !!isMobile)}

        {/* Vendas */}
        {renderSection(FileText, "Vendas", vendasItems, !!isAdmin, collapsed && !isMobile, !!isMobile)}

        <Separator className="my-2" />

        {/* Configurações */}
        {renderSection(Settings, "Configurações", configItems, !!isAdmin, collapsed && !isMobile, !!isMobile)}

        {/* Integrações */}
        {renderSection(Plug, "Integrações", integracoesItems, !!isAdmin, collapsed && !isMobile, !!isMobile)}
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
