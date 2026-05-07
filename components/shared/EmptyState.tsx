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
        <Icon size={30} className="text-indigo-400" />
      </div>
      <div className="space-y-1.5">
        <p className="text-lg font-semibold text-slate-100">{title}</p>
        {description && (
          <p className="text-base text-slate-400 max-w-xs">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
