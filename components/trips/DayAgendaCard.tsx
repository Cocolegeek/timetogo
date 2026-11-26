"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Navigation } from "lucide-react";
import { useOpenLocation, useOpenRoute } from "@/components/shared/MapAppPicker";
import { ITINERARY_TYPES, JOURNEY_MODES, itemTitle } from "@/lib/itinerary-types";
import { pickRelevantPlanningDay, relativeDayLabel } from "@/lib/planning-day";
import { cn } from "@/lib/utils";
import type { ItineraryItem } from "@/types";

const MAX_ROWS = 4;

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function useNowMinutes(): number {
  const [now, setNow] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    }, 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function countdown(mins: number): string {
  if (mins <= 0) return "Maintenant";
  if (mins < 60) return `Dans ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `Dans ${h} h ${String(m).padStart(2, "0")}` : `Dans ${h} h`;
}

/**
 * The dashboard's single planning block: the most relevant day, with the
 * current / next step of today pulled to the top (countdown + « Y aller »)
 * and the rest of the day underneath: each step shown once.
 */
export function DayAgendaCard({ items, today, planningHref }: { items: ItineraryItem[]; today: string; planningHref: string }) {
  const now = useNowMinutes();
  const openLocation = useOpenLocation();
  const openRoute = useOpenRoute();
  let day = pickRelevantPlanningDay(items, today);
  // Once today's last step is over, tomorrow is what matters.
  if (day?.daysOffset === 0 && day.items.every((i) => i.time && minutesOf(i.time) + (i.durationMinutes ?? 60) <= now)) {
    day = pickRelevantPlanningDay(items.filter((i) => i.date > today), today) ?? day;
  }

  // Nothing planned yet: « Premiers pas » and the Planning tab already invite to add a step.
  if (!day) return null;

  const isToday = day.daysOffset === 0;
  const timed = day.items.filter((i) => i.time);
  const current = isToday
    ? [...timed].reverse().find((i) => {
        const start = minutesOf(i.time!);
        return start <= now && now < start + (i.durationMinutes ?? 60);
      })
    : undefined;
  const next = isToday ? timed.find((i) => minutesOf(i.time!) > now) : undefined;
  const focus = current ?? next;
  const rest = day.items.filter((i) => i !== focus);
  const shown = rest.slice(0, MAX_ROWS);
  const isPast = (i: ItineraryItem) => isToday && !!i.time && minutesOf(i.time) + (i.durationMinutes ?? 60) <= now;

  const canRoute = focus?.type === "journey" && focus.location && focus.destination;
  const canLocate = focus && !canRoute && focus.location;

  return (
    <section className="rounded-[1.75rem] bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[1.15rem] font-bold tracking-tight">{relativeDayLabel(day.daysOffset)}</h2>
        <Link href={planningHref} className="-mr-2 flex h-9 items-center gap-0.5 rounded-full px-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          Planning
          <ChevronRight size={16} />
        </Link>
      </div>

      {focus && (
        <div className="mt-4 rounded-[1.25rem] bg-secondary p-4">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              {focus === current ? "En cours" : "À suivre"}
            </span>
            <span className="tabular text-muted-foreground">{focus.time!.slice(0, 5)}</span>
          </div>
          <p className="tabular mt-1.5 font-display text-[1.75rem] leading-none font-extrabold tracking-[-0.03em]">
            {focus === current ? "Maintenant" : countdown(minutesOf(focus.time!) - now)}
          </p>
          <div className="mt-3.5 flex items-center gap-3">
            <ItemIcon item={focus} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{itemTitle(focus)}</span>
              {focus.location && (
                <span className="block truncate text-sm text-muted-foreground">
                  {canRoute ? `${focus.location.split(",")[0]} → ${focus.destination!.split(",")[0]}` : focus.location}
                </span>
              )}
            </span>
            {(canRoute || canLocate) && (
              <button
                type="button"
                onClick={() =>
                  canRoute
                    ? openRoute(focus.location!, focus.destination!, focus.journeyMode ? { mode: focus.journeyMode } : undefined)
                    : openLocation(focus.location!)
                }
                className="pressable flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                <Navigation size={15} />
                Y aller
              </button>
            )}
          </div>
        </div>
      )}

      {shown.length > 0 && (
        <ol className="relative mt-4 space-y-3.5 before:absolute before:top-3 before:bottom-3 before:left-[1.1875rem] before:w-px before:bg-border">
          {shown.map((item) => (
            <li key={item.id} className={cn("relative flex items-center gap-3.5 transition-opacity", isPast(item) && "opacity-45")}>
              <ItemIcon item={item} ring />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{itemTitle(item)}</span>
                {item.location && <span className="block truncate text-sm text-muted-foreground">{item.location}</span>}
              </span>
              {item.time && <span className="tabular shrink-0 text-sm font-semibold text-muted-foreground">{item.time.slice(0, 5)}</span>}
            </li>
          ))}
        </ol>
      )}
      {rest.length > MAX_ROWS && (
        <p className="mt-3 pl-[3.375rem] text-sm text-muted-foreground">
          + {rest.length - MAX_ROWS} autre{rest.length - MAX_ROWS > 1 ? "s" : ""}
        </p>
      )}
    </section>
  );
}

function ItemIcon({ item, ring }: { item: ItineraryItem; ring?: boolean }) {
  const Icon = item.type === "journey" && item.journeyMode ? JOURNEY_MODES[item.journeyMode].icon : ITINERARY_TYPES[item.type].icon;
  return (
    <span className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-full", ITINERARY_TYPES[item.type].tile, ring && "ring-4 ring-card")}>
      <Icon size={18} />
    </span>
  );
}
