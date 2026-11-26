"use client";

import { useState } from "react";
import { CalendarOff, ListChecks, Map, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { TRIP_MODULES } from "@/lib/trip-features";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { TripModule } from "@/types";

const ICONS: Record<TripModule, LucideIcon> = { planning: Map, menus: UtensilsCrossed, lists: ListChecks };

interface ModulePickerProps {
  value: TripModule[];
  onChange: (next: TripModule[]) => void;
  /** Faux sans dates : planning et menus ont besoin de jours. */
  canPlan: boolean;
}

/** Les espaces en plus du budget : trois tuiles à toucher, la tuile sombre est activée. */
export function ModulePicker({ value, onChange, canPlan }: ModulePickerProps) {
  const [hint, setHint] = useState(false);
  return (
    <div>
    <div className="grid grid-cols-3 gap-2">
      {TRIP_MODULES.map((m) => {
        const Icon = ICONS[m.id];
        const locked = m.needsDates && !canPlan;
        const on = !locked && value.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            role="switch"
            aria-checked={on}
            aria-disabled={locked}
            aria-label={locked ? `${m.label} (il faut des dates)` : m.label}
            onClick={() => {
              if (locked) {
                haptic("light");
                setHint(true);
                return;
              }
              setHint(false);
              haptic("light");
              onChange(on ? value.filter((x) => x !== m.id) : [...value, m.id]);
            }}
            className={cn(
              "pressable relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-[1.25rem] px-2 py-4 transition-colors",
              on ? "bg-primary text-primary-foreground" : "bg-secondary",
              locked && "opacity-40"
            )}
          >
            <Icon size={26} aria-hidden="true" />
            <span className="text-[0.9375rem] font-semibold">{m.label}</span>
            {locked && <CalendarOff size={14} className="absolute top-2.5 right-2.5" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
    {hint && !canPlan && (
      <p role="alert" className="mt-2 px-1 text-sm text-muted-foreground">
        Planning et Menus ont besoin de dates.
      </p>
    )}
    </div>
  );
}
