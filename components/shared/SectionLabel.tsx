import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
  className?: string;
}

/** Section title inside a screen ("Ils me doivent", "À venir"…). */
export function SectionLabel({ children, count, action, className }: SectionLabelProps) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3 px-1", className)}>
      <h2 className="flex items-center gap-2 font-display text-[1.15rem] font-bold tracking-tight text-foreground">
        {children}
        {count !== undefined && count > 0 && (
          <span className="tabular rounded-full bg-foreground/[0.07] px-2 py-0.5 font-sans text-xs font-semibold text-muted-foreground">
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  );
}
