"use client";

import { m as motion } from "framer-motion";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string; badge?: number }[];
  value: T;
  onChange: (value: T) => void;
  /** Unique id so several controls on one page animate independently. */
  id: string;
  className?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, id, className }: SegmentedControlProps<T>) {
  return (
    <div role="tablist" className={cn("flex h-11 items-center gap-1 rounded-full bg-foreground/[0.06] p-1", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative flex h-full flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[0.9375rem] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring}
                className="absolute inset-0 rounded-full bg-card shadow-card dark:bg-foreground/[0.12]"
              />
            )}
            <span className="relative">{opt.label}</span>
            {opt.badge !== undefined && opt.badge > 0 && (
              <span className="tabular relative rounded-full bg-primary px-1.5 py-0.5 text-[0.6875rem] leading-none font-bold text-primary-foreground">
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
