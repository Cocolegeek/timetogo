"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  UtensilsCrossed,
  Hourglass,
  Map,
} from "lucide-react";
import { GlassCard } from "@/components/layout/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { SLOT_CONFIG } from "@/lib/meals/slots";
import { formatDuration, daysUntil } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type { ItineraryItem, ItineraryType, Meal, MealSlot, Trip } from "@/types";

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

type PlanContext = "today" | "first-day" | "last-day";

export function TodayPlanningBlock({ trip }: TodayPlanningBlockProps) {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine which date is the most relevant: today, the first day, or the last day
  const today = new Date().toISOString().split("T")[0];
  let context: PlanContext;
  let targetDate: string;
  if (today < trip.startDate) {
    context = "first-day";
    targetDate = trip.startDate;
  } else if (today > trip.endDate) {
    context = "last-day";
    targetDate = trip.endDate;
  } else {
    context = "today";
    targetDate = today;
  }

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    setLoading(true);
    (async () => {
      const [itineraryRes, mealsRes] = await Promise.all([
        supabase
          .from("itinerary_items")
          .select("*")
          .eq("trip_id", trip.id)
          .eq("date", targetDate)
          .order("time", { nullsFirst: true }),
        supabase
          .from("meals")
          .select("*")
          .eq("trip_id", trip.id)
          .eq("date", targetDate)
          .order("position"),
      ]);

      if (cancelled) return;

      const mappedItems = (itineraryRes.data ?? []).map((row): ItineraryItem => ({
        id: row.id,
        tripId: row.trip_id,
        date: row.date,
        time: row.time ?? undefined,
        title: row.title,
        description: row.description ?? undefined,
        location: row.location ?? undefined,
        type: row.type,
        durationMinutes: row.duration_minutes ?? undefined,
        participantIds: Array.isArray(row.participant_ids) ? row.participant_ids : [],
        createdAt: row.created_at,
      }));

      const mappedMeals = (mealsRes.data ?? []).map((row): Meal => ({
        id: row.id,
        tripId: row.trip_id,
        date: row.date,
        slot: row.slot as MealSlot,
        title: row.title,
        notes: row.notes ?? undefined,
        participantIds: Array.isArray(row.participant_ids) ? row.participant_ids : [],
        dishes: Array.isArray(row.dishes) ? row.dishes : [],
        position: row.position ?? 0,
        createdAt: row.created_at,
      }));

      setItems(mappedItems);
      setMeals(mappedMeals);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [trip.id, targetDate]);

  const headerLabel = (() => {
    if (context === "today") return "Aujourd'hui";
    if (context === "first-day") {
      const days = daysUntil(trip.startDate);
      return days === 1 ? "Demain · départ" : `Dans ${days} jours · départ`;
    }
    return "Dernier jour du voyage";
  })();

  const contextColor = {
    today: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
    "first-day": "text-sky-300 bg-sky-500/15 border-sky-500/30",
    "last-day": "text-slate-400 bg-white/5 border-white/10",
  }[context];

  const dateLabel = new Date(targetDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const filledMeals = meals.filter((m) => m.dishes.length > 0);
  const isEmpty = items.length === 0 && filledMeals.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <GlassCard padding={false} className="overflow-hidden">
        {/* Header — links to trip dashboard */}
        <Link
          href={`/trips/${trip.id}`}
          className="block p-4 border-b border-white/8 hover:bg-white/4 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl shrink-0">{trip.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-slate-100 truncate">
                {trip.name}
              </p>
              <p className="text-xs text-slate-500 truncate">{dateLabel}</p>
            </div>
            <span
              className={cn(
                "text-[11px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider whitespace-nowrap",
                contextColor
              )}
            >
              {headerLabel}
            </span>
          </div>
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-500/40 border-t-indigo-400 animate-spin" />
          </div>
        ) : isEmpty ? (
          <div className="px-4 py-6 text-center space-y-3">
            <p className="text-sm text-slate-500">
              {context === "first-day"
                ? "Aucune étape prévue pour le 1er jour."
                : context === "last-day"
                ? "Pas d'étape pour la dernière journée."
                : "Rien de prévu aujourd'hui."}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link
                href={`/trips/${trip.id}/planning`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20 transition-colors"
              >
                <Map size={12} />
                Planning
              </Link>
              <Link
                href={`/trips/${trip.id}/menus`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
              >
                <UtensilsCrossed size={12} />
                Menus
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/8">
            {/* Itinerary items */}
            {items.length > 0 && (
              <Link
                href={`/trips/${trip.id}/planning`}
                className="block p-4 hover:bg-white/4 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Map size={12} />
                    Planning
                  </p>
                  <ChevronRight size={14} className="text-slate-600" />
                </div>
                <div className="space-y-1.5">
                  {items.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="text-base shrink-0">
                        {TYPE_EMOJI[item.type]}
                      </span>
                      {item.time && (
                        <span className="text-xs text-slate-500 tabular-nums shrink-0">
                          {item.time}
                        </span>
                      )}
                      <span className="text-slate-200 font-medium truncate">
                        {item.title}
                      </span>
                      {item.location && (
                        <>
                          <span className="text-slate-600 shrink-0">·</span>
                          <span className="text-xs text-slate-500 truncate flex items-center gap-0.5">
                            <MapPin size={10} />
                            {item.location}
                          </span>
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
                  {items.length > 3 && (
                    <p className="text-xs text-slate-500 pt-0.5">
                      + {items.length - 3} autre{items.length - 3 !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </Link>
            )}

            {/* Meals */}
            {filledMeals.length > 0 && (
              <Link
                href={`/trips/${trip.id}/menus`}
                className="block p-4 hover:bg-white/4 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <UtensilsCrossed size={12} />
                    Menus du jour
                  </p>
                  <ChevronRight size={14} className="text-slate-600" />
                </div>
                <div className="space-y-1.5">
                  {filledMeals.slice(0, 3).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="text-base shrink-0">
                        {SLOT_CONFIG[m.slot].emoji}
                      </span>
                      <span className="text-slate-200 font-medium shrink-0">
                        {m.title}
                      </span>
                      <span className="text-slate-600 shrink-0">·</span>
                      <span className="text-sm text-slate-400 truncate">
                        {m.dishes.map((d) => d.name).join(" · ")}
                      </span>
                    </div>
                  ))}
                  {filledMeals.length > 3 && (
                    <p className="text-xs text-slate-500 pt-0.5">
                      + {filledMeals.length - 3} autre
                      {filledMeals.length - 3 !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </Link>
            )}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
