"use client";

import { useEffect, useRef } from "react";
import { m as motion } from "framer-motion";
import { spring } from "@/lib/motion";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/utils";

interface DayTabsProps {
  dates: string[];
  activeDate: string;
  onChange: (date: string) => void;
  today: string;
  /** Unique id for the sliding indicator. */
  id?: string;
  /** Optional per-date dot (e.g. the day has content). */
  marked?: Set<string>;
}

/**
 * Horizontal day picker, sticky under the trip header. The selected day gets
 * an ink pill that slides between days.
 */
export function DayTabs({ dates, activeDate, onChange, today, id = "day", marked }: DayTabsProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const scrolled = useScrolled(4);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeDate]);

  if (dates.length === 0) return null;

  return (
    <div
      className={cn(
        "sticky z-20 -mx-4 px-4 py-2 transition-colors duration-300",
        scrolled ? "bg-background/85 backdrop-blur-xl backdrop-saturate-150" : "bg-background"
      )}
      style={{ top: "calc(env(safe-area-inset-top) + 3.5rem)" }}
    >
      <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 py-1">
        {dates.map((d) => {
          const isActive = d === activeDate;
          const isToday = d === today;
          const isPast = d < today;
          const date = new Date(d);
          const day = date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
          return (
            <button
              key={d}
              ref={isActive ? activeRef : null}
              type="button"
              onClick={() => onChange(d)}
              aria-pressed={isActive}
              aria-label={date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              className={cn(
                "relative flex h-[4.25rem] w-[3.25rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                isActive ? "text-background" : isPast ? "text-muted-foreground/70 hover:bg-foreground/[0.04]" : "text-foreground hover:bg-foreground/[0.04]"
              )}
            >
              {isActive && (
                <motion.span layoutId={`daytab-${id}`} transition={spring} className="absolute inset-0 rounded-2xl bg-foreground" />
              )}
              <span className={cn("relative text-xs font-medium capitalize", isActive ? "text-background/70" : "text-muted-foreground")}>
                {day}
              </span>
              <span className="tabular relative font-display text-lg leading-none font-bold">{date.getDate()}</span>
              <span
                className={cn(
                  "relative mt-0.5 size-1 rounded-full",
                  isToday ? (isActive ? "bg-background" : "bg-primary") : marked?.has(d) ? (isActive ? "bg-background/50" : "bg-foreground/25") : "bg-transparent"
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
