"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clock,
  MapPin,
  ChevronRight,
  Hourglass,
  Map,
} from "lucide-react";
import { GlassCard } from "@/components/layout/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { openLocation } from "@/lib/map-apps";
import { formatDuration } from "@/lib/format-date";
import {
  pickRelevantPlanningDay,
  relativeDayLabel,
  type RelevantDay,
} from "@/lib/planning-day";
import { cn } from "@/lib/utils";
import type { ItineraryItem, ItineraryType, Trip } from "@/types";

interface TodayPlanningBlockProps {
  trip: Trip;
}

const TYPE_EMOJI: Record<ItineraryType, string> = {
  transport: "🚗",
  accommodation: "🏨",
  activity: "🎯",
  food: "🍽️",
  other: "📍",
};

export function TodayPlanningBlock({ trip }: TodayPlanningBlockProps) {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("itinerary_items")
        .select("*")
        .eq("trip_id", trip.id);

      if (cancelled) return;

      const mapped = (data ?? []).map(
        (row): ItineraryItem => ({
          id: row.id,
          tripId: row.trip_id,
          date: row.date,
          time: row.time ?? undefined,
          title: row.title,
          description: row.description ?? undefined,
          location: row.location ?? undefined,
          type: row.type,
          durationMinutes: row.duration_minutes ?? undefined,
          participantIds: Array.isArray(row.participant_ids)
            ? row.participant_ids
            : [],
          createdAt: row.created_at,
        })
      );

      setItems(mapped);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [trip.id]);

  const today = new Date().toISOString().split("T")[0];
  const relevantDay = pickRelevantPlanningDay(items, today);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Link href={`/trips/${trip.id}/planning`} className="block">
        <GlassCard padding={false} className="overflow-hidden hover:border-foreground/15 transition-colors active:scale-[0.99]">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-foreground/8">
            <span className="text-3xl shrink-0">{trip.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-slate-100 truncate">
                {trip.name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {relevantDay
                  ? new Date(relevantDay.date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : "Aucune étape planifiée"}
              </p>
            </div>
            {relevantDay && (
              <ContextBadge offset={relevantDay.daysOffset} />
            )}
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div
                className="w-6 h-6 rounded-full border-2 animate-spin"
                style={{
                  borderColor: "var(--accent-border)",
                  borderTopColor: "var(--accent-400)",
                }}
              />
            </div>
          ) : !relevantDay ? (
            <div className="px-4 py-6 text-center">
              <Map size={24} className="mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">Aucune étape planifiée</p>
            </div>
          ) : (
            <div className="p-4">
              <PlanningSection day={relevantDay} />
              <div className="flex items-center justify-end mt-3 text-xs text-slate-500 gap-1">
                <span>Voir le planning</span>
                <ChevronRight size={12} />
              </div>
            </div>
          )}
        </GlassCard>
      </Link>
    </motion.div>
  );
}

function ContextBadge({ offset }: { offset: number }) {
  const className =
    offset === 0
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : offset > 0
      ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
      : "bg-foreground/5 text-slate-400 border-foreground/10";

  return (
    <span
      className={cn(
        "text-[11px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider whitespace-nowrap shrink-0",
        className
      )}
    >
      {relativeDayLabel(offset)}
    </span>
  );
}

function PlanningSection({ day }: { day: RelevantDay }) {
  return (
    <div className="space-y-1.5">
      {day.items.slice(0, 4).map((item) => (
        <div key={item.id} className="flex items-center gap-2 text-sm">
          <span className="text-base shrink-0">{TYPE_EMOJI[item.type]}</span>
          {item.time && (
            <span className="text-xs text-slate-500 tabular-nums shrink-0 flex items-center gap-0.5">
              <Clock size={10} />
              {item.time}
            </span>
          )}
          <span className="text-slate-200 font-medium truncate">
            {item.title}
          </span>
          {item.location && (
            <>
              <span className="text-slate-600 shrink-0">·</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openLocation(item.location!); }}
                className="text-xs text-slate-500 truncate flex items-center gap-0.5 hover:text-sky-400 active:text-sky-300 transition-colors"
              >
                <MapPin size={10} />
                {item.location}
              </button>
            </>
          )}
          {item.durationMinutes && (
            <>
              <span className="text-slate-600 shrink-0 ml-auto">·</span>
              <span className="text-xs text-slate-500 shrink-0 flex items-center gap-0.5">
                <Hourglass size={10} />
                {formatDuration(item.durationMinutes)}
              </span>
            </>
          )}
        </div>
      ))}
      {day.items.length > 4 && (
        <p className="text-xs text-slate-500 pt-0.5">
          + {day.items.length - 4} autre{day.items.length - 4 !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
