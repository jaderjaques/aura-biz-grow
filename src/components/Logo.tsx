interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export function Logo({ collapsed = false, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shrink-0">
        <span className="text-white font-bold text-sm">R</span>
      </div>
      {!collapsed && (
        <span className="text-xl font-bold gradient-text whitespace-nowrap">
          Responde uAI
        </span>
      )}
    </div>
  );
}
