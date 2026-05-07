"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, UtensilsCrossed, ChefHat, Users } from "lucide-react";
import { GlassCard } from "@/components/layout/GlassCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { MealEditDialog } from "@/components/menus/MealEditDialog";
import { useTrip } from "@/hooks/useTrip";
import { useMeals } from "@/hooks/useMeals";
import { DEFAULT_SLOTS, SLOT_CONFIG, eachDate } from "@/lib/meals/slots";
import { CATEGORY_CONFIG } from "@/lib/meals/categories";
import { cn } from "@/lib/utils";
import type { Meal, MealSlot, Participant } from "@/types";

interface MenusPageProps {
  params: Promise<{ tripId: string }>;
}

export default function MenusPage({ params }: MenusPageProps) {
  const { tripId } = use(params);
  const { trip } = useTrip(tripId);
  const { meals, loading, refetch, updateMeal } = useMeals(
    tripId,
    trip ? { startDate: trip.startDate, endDate: trip.endDate } : undefined
  );

  const [refreshing, setRefreshing] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 400);
  };

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Auto-scroll to today's section once data is loaded
  useEffect(() => {
    if (loading) return;
    const el = todayRef.current;
    if (!el) return;
    // Wait for next paint so the layout is stable
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }, [loading]);

  if (!trip) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/50 border-t-indigo-400 animate-spin" />
      </div>
    );
  }

  const dates = eachDate(trip.startDate, trip.endDate);

  // Index meals by `${date}#${slot}` for O(1) lookup
  const mealMap = new Map<string, Meal>();
  for (const m of meals) mealMap.set(`${m.date}#${m.slot}`, m);

  return (
    <div className="space-y-4">
      {/* Refresh action */}
      <div className="flex justify-end -mt-1 -mb-2">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/8 active:bg-white/12 transition-all"
          title="Actualiser"
        >
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500/50 border-t-indigo-400 animate-spin" />
        </div>
      ) : dates.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Aucun jour de voyage"
          description="Vérifie les dates du voyage pour générer les repas."
        />
      ) : (
        <div className="space-y-6">
          {dates.map((d, idx) => {
            const isToday = d === today;
            const isPast = d < today;
            return (
              <motion.section
                key={d}
                ref={isToday ? todayRef : undefined}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: isPast ? 0.45 : 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                className="scroll-mt-2"
              >
                <DayHeader date={d} isToday={isToday} isPast={isPast} />
                <div className="space-y-2.5">
                  {DEFAULT_SLOTS.map((slot) => {
                    const meal = mealMap.get(`${d}#${slot.slot}`);
                    return meal ? (
                      <MealCard
                        key={meal.id}
                        meal={meal}
                        participants={trip.participants}
                        onTap={() => setEditingMeal(meal)}
                      />
                    ) : (
                      // Should never happen (auto-gen ensures all 3 exist),
                      // but keep a placeholder for resilience
                      <PlaceholderCard
                        key={slot.slot}
                        slotLabel={slot.shortLabel}
                      />
                    );
                  })}
                </div>
              </motion.section>
            );
          })}
        </div>
      )}

      <MealEditDialog
        open={editingMeal !== null}
        onOpenChange={(open) => {
          if (!open) setEditingMeal(null);
        }}
        meal={editingMeal}
        participants={trip.participants}
        onSave={async (data) => {
          if (!editingMeal) return;
          await updateMeal(editingMeal.id, data);
        }}
      />
    </div>
  );
}

function DayHeader({
  date,
  isToday,
  isPast,
}: {
  date: string;
  isToday: boolean;
  isPast: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 mb-3 px-1">
      <p
        className={cn(
          "text-sm font-semibold uppercase tracking-wider",
          isToday
            ? "text-indigo-300"
            : isPast
            ? "text-slate-500"
            : "text-slate-300"
        )}
      >
        {new Date(date).toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </p>
      {isToday && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold tracking-normal">
          AUJ.
        </span>
      )}
    </div>
  );
}

function MealCard({
  meal,
  participants,
  onTap,
}: {
  meal: Meal;
  participants: Participant[];
  onTap: () => void;
}) {
  const slotCfg = SLOT_CONFIG[meal.slot];
  const catCfg = CATEGORY_CONFIG[meal.category];

  const cooks = participants.filter((p) => meal.cookIds.includes(p.id));
  const cookLabel =
    cooks.length === 0
      ? null
      : cooks.length === 1
      ? cooks[0].name
      : cooks.length === participants.length
      ? "Tous"
      : `${cooks.length} pers.`;

  // Empty list semantics: empty = "Tous" (everyone implicitly)
  const eatersCount = meal.participantIds.length;
  const eaterLabel =
    eatersCount === 0 || eatersCount === participants.length
      ? "Tous"
      : `${eatersCount} pers.`;

  return (
    <motion.div layout>
      <GlassCard padding={false} className="overflow-hidden">
        <div
          role="button"
          tabIndex={0}
          onClick={onTap}
          onKeyDown={(e) => {
            if (e.key === "Enter") onTap();
          }}
          className="flex cursor-pointer active:bg-white/4 transition-colors"
        >
          {/* Colored left strip — visual category at a glance */}
          <div className={cn("w-1.5 shrink-0", catCfg.stripClass)} />

          <div className="flex-1 min-w-0 p-3.5">
            {/* Top row: slot label + category badge */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {slotCfg.shortLabel}
              </span>
              <span
                className={cn(
                  "text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
                  catCfg.badgeClass
                )}
              >
                {catCfg.label}
              </span>
            </div>

            {/* Title — main info */}
            <p className="text-base font-semibold text-slate-100 leading-tight truncate">
              {meal.title}
            </p>

            {/* Footer: cook + eaters */}
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
              {cookLabel && (
                <span className="flex items-center gap-1">
                  <ChefHat size={12} className="text-amber-400/80" />
                  {cookLabel}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users size={12} className="text-slate-500" />
                {eaterLabel}
              </span>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function PlaceholderCard({ slotLabel }: { slotLabel: string }) {
  return (
    <GlassCard padding={false} className="overflow-hidden opacity-60">
      <div className="p-3.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {slotLabel}
        </span>
        <p className="text-sm text-slate-500 mt-1">Repas non initialisé</p>
      </div>
    </GlassCard>
  );
}
