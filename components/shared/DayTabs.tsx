"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface DayTabsProps {
  dates: string[];
  activeDate: string;
  onChange: (date: string) => void;
  today: string;
  /** Optional accent color override (default = section). */
  accent?: "section" | "sky";
}

/**
 * Horizontal scrollable list of day chips used on the menus and
 * planning pages to switch between days without scrolling through
 * the whole trip. Sticky just under the trip header.
 */
export function DayTabs({ dates, activeDate, onChange, today, accent = "section" }: DayTabsProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeDate]);

  if (dates.length === 0) return null;

  return (
    <div
      className="sticky z-20 -mx-4 px-4 py-2 glass-strong border-b border-foreground/8"
      style={{ top: "calc(env(safe-area-inset-top) + 3.25rem)" }}
    >
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {dates.map((d) => {
          const isActive = d === activeDate;
          const isToday = d === today;
          const isPast = d < today;
          const date = new Date(d);
          const day = date.toLocaleDateString("fr-FR", { weekday: "short" });
          const num = date.getDate();
          return (
            <button
              key={d}
              ref={isActive ? activeRef : null}
              type="button"
              onClick={() => onChange(d)}
              className={cn(
                "flex flex-col items-center px-3 py-1.5 rounded-xl shrink-0 transition-all min-w-[3rem]",
                isActive
                  ? accent === "sky"
                    ? "bg-sky-500/15 ring-1 ring-sky-400 text-sky-300"
                    : "bg-section-soft ring-1 ring-section text-section-soft"
                  : isPast
                    ? "text-slate-600 hover:bg-foreground/5"
                    : "text-slate-300 hover:bg-foreground/5",
                isToday &&
                  !isActive &&
                  (accent === "sky"
                    ? "ring-1 ring-sky-400/30"
                    : "ring-1 ring-section/30")
              )}
            >
              <span className="text-[10px] uppercase tracking-wider font-semibold">
                {day.replace(".", "")}
              </span>
              <span className="text-base font-bold tabular-nums leading-tight">
                {num}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
