"use client";

import { ListChecks, Map, UtensilsCrossed, type LucideIcon } from "lucide-react";
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

/** « Au programme » : les espaces facultatifs en plus du budget, qui est toujours là. */
export function ModulePicker({ value, onChange, canPlan }: ModulePickerProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between px-1">
        <p className="text-sm font-semibold">Au programme</p>
        <p className="text-xs text-muted-foreground">Le budget est toujours là</p>
      </div>
      <div className="overflow-hidden rounded-[1.25rem] bg-secondary [&>*+*]:border-t [&>*+*]:border-border">
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
              onClick={() => {
                if (locked) return;
                haptic("light");
                onChange(on ? value.filter((x) => x !== m.id) : [...value, m.id]);
              }}
              className={cn("flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left", locked && "opacity-50")}
            >
              <Icon size={19} className="shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.95rem] font-semibold">{m.label}</span>
                <span className="block text-sm text-muted-foreground">{locked ? "Choisis des dates pour l'activer." : m.hint}</span>
              </span>
              <span
                aria-hidden="true"
                className={cn("flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors", on ? "bg-primary" : "bg-foreground/20")}
              >
                <span className={cn("size-6 rounded-full bg-background shadow transition-transform", on && "translate-x-5")} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
