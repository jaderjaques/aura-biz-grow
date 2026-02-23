import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarSectionProps {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsed?: boolean;
  isMobile?: boolean;
}

export function SidebarSection({
  icon: Icon,
  label,
  children,
  defaultOpen = false,
  collapsed = false,
  isMobile = false,
}: SidebarSectionProps) {
  const storageKey = `sidebar-${label.toLowerCase()}-open`;

  const [isOpen, setIsOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored !== null ? stored === "true" : defaultOpen;
    } catch {
      return defaultOpen;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(isOpen));
    } catch {}
  }, [isOpen, storageKey]);

  if (collapsed && !isMobile) {
    return <>{children}</>;
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "sidebar-item group w-full",
          "justify-between"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="ml-3 pl-3 border-l border-sidebar-border space-y-0.5 mt-0.5">
          {children}
        </div>
      )}
    </div>
  );
}
