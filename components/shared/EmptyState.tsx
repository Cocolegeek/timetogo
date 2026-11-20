import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("animate-fade-up flex flex-col items-center justify-center gap-4 px-6 py-14 text-center", className)}>
      <div className="flex size-16 items-center justify-center rounded-[1.25rem] bg-primary/10 text-primary">
        <Icon size={28} strokeWidth={2} />
      </div>
      <div className="space-y-1.5">
        <p className="font-display text-xl font-bold tracking-tight text-foreground">{title}</p>
        {description && <p className="mx-auto max-w-xs text-[0.95rem] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
