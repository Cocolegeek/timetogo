import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 text-center",
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
        <Icon size={28} className="text-indigo-400" />
      </div>
      <div>
        <p className="text-base font-medium text-slate-200">{title}</p>
        {description && (
          <p className="text-sm text-slate-500 mt-1 max-w-xs">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
