import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Large-title header used at the top of every main screen. */
export function PageHeader({ title, eyebrow, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="truncate text-sm font-medium text-muted-foreground">{eyebrow}</p>}
        <h1 className="font-display text-[2.125rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-[0.95rem] text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </div>
  );
}
