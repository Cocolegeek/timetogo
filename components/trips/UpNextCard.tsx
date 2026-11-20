"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation } from "lucide-react";
import { useOpenLocation, useOpenRoute } from "@/components/shared/MapAppPicker";
import { ITINERARY_TYPES, JOURNEY_MODES } from "@/lib/itinerary-types";
import { cn } from "@/lib/utils";
import type { ItineraryItem } from "@/types";

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

/** Glanceable "what's next today" card, Flighty-style. Renders nothing when the day is over. */
export function UpNextCard({ items, today, planningHref }: { items: ItineraryItem[]; today: string; planningHref: string }) {
  const now = useNowMinutes();
  const openLocation = useOpenLocation();
  const openRoute = useOpenRoute();

  const timed = items
    .filter((i) => i.date === today && i.time)
    .sort((a, b) => a.time!.localeCompare(b.time!));
  const current = [...timed].reverse().find((i) => {
    const start = minutesOf(i.time!);
    return start <= now && now < start + (i.durationMinutes ?? 60);
  });
  const next = timed.find((i) => minutesOf(i.time!) > now);
  const item = current ?? next;
  if (!item) return null;

  const isNow = item === current;
  const cfg = ITINERARY_TYPES[item.type];
  const Icon = item.type === "journey" && item.journeyMode ? JOURNEY_MODES[item.journeyMode].icon : cfg.icon;
  const canRoute = item.type === "journey" && item.location && item.destination;
  const canLocate = !canRoute && item.location;
  const after = isNow ? next : timed[timed.indexOf(item) + 1];

  return (
    <section className="overflow-hidden rounded-[1.75rem] bg-card shadow-card">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            {isNow ? "En ce moment" : "À suivre"}
          </span>
          <span className="tabular text-sm font-semibold text-muted-foreground">{item.time!.slice(0, 5)}</span>
        </div>
        <p className="tabular mt-2 font-display text-[1.9rem] leading-none font-extrabold tracking-[-0.03em]">
          {isNow ? "Maintenant" : countdown(minutesOf(item.time!) - now)}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", cfg.tile)}>
            <Icon size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{item.title}</span>
            {item.location && (
              <span className="block truncate text-sm text-muted-foreground">
                {canRoute ? `${item.location.split(",")[0]} → ${item.destination!.split(",")[0]}` : item.location}
              </span>
            )}
          </span>
        </div>
        <div className="mt-4 flex gap-2">
          {(canRoute || canLocate) && (
            <button
              type="button"
              onClick={() =>
                canRoute
                  ? openRoute(item.location!, item.destination!, item.journeyMode ? { mode: item.journeyMode } : undefined)
                  : openLocation(item.location!)
              }
              className="pressable flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-[0.95rem] font-semibold text-primary-foreground shadow-section"
            >
              <Navigation size={17} />
              Y aller
            </button>
          )}
          <Link
            href={planningHref}
            className="pressable flex h-11 flex-1 items-center justify-center rounded-full bg-foreground/[0.06] text-[0.95rem] font-semibold transition-colors hover:bg-foreground/10"
          >
            Voir la journée
          </Link>
        </div>
      </div>
      {after && (
        <div className="flex items-center gap-2 border-t border-border bg-secondary/60 px-5 py-3 text-sm">
          <span className="text-muted-foreground">Ensuite</span>
          <span className="tabular font-semibold">{after.time!.slice(0, 5)}</span>
          <span className="truncate">{after.title}</span>
        </div>
      )}
    </section>
  );
}
