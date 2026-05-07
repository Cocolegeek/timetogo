"use client";

import { use, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Plus,
  UtensilsCrossed,
  Users,
  ChevronRight,
} from "lucide-react";
import { GlassCard } from "@/components/layout/GlassCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useTrip } from "@/hooks/useTrip";
import { useMeals } from "@/hooks/useMeals";
import { SLOT_CONFIG, eachDate } from "@/lib/meals/slots";
import { cn } from "@/lib/utils";
import type { Meal } from "@/types";

interface MenusPageProps {
  params: Promise<{ tripId: string }>;
}

export default function MenusPage({ params }: MenusPageProps) {
  const { tripId } = use(params);
  const { trip } = useTrip(tripId);
  const { meals, loading, refetch } = useMeals(
    tripId,
    trip ? { startDate: trip.startDate, endDate: trip.endDate } : undefined
  );

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 400);
  };

  if (!trip) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/50 border-t-indigo-400 animate-spin" />
      </div>
    );
  }

  const dates = eachDate(trip.startDate, trip.endDate);
  const today = new Date().toISOString().split("T")[0];

  const mealsByDate = meals.reduce<Record<string, Meal[]>>((acc, m) => {
    if (!acc[m.date]) acc[m.date] = [];
    acc[m.date].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
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
          <AnimatePresence>
            {dates.map((d, idx) => {
              const dayMeals = (mealsByDate[d] ?? []).sort(
                (a, b) => a.position - b.position
              );
              const isToday = d === today;
              return (
                <motion.div
                  key={d}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <div className="flex items-baseline justify-between mb-3 px-1">
                    <p
                      className={cn(
                        "text-sm font-semibold uppercase tracking-wider",
                        isToday ? "text-indigo-300" : "text-slate-400"
                      )}
                    >
                      {new Date(d).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                      {isToday && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold tracking-normal">
                          AUJ.
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 disabled:opacity-50"
                      disabled
                      title="Bientôt disponible"
                    >
                      <Plus size={12} />
                      Repas
                    </button>
                  </div>

                  <div className="space-y-2">
                    {dayMeals.map((m) => (
                      <MealRow
                        key={m.id}
                        meal={m}
                        participantsCount={trip.participants.length}
                        participantNames={trip.participants}
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function MealRow({
  meal,
  participantsCount,
  participantNames,
}: {
  meal: Meal;
  participantsCount: number;
  participantNames: { id: string; name: string; color: string }[];
}) {
  const cfg = SLOT_CONFIG[meal.slot];
  const involved = participantNames.filter((p) =>
    meal.participantIds.includes(p.id)
  );
  const everyone = involved.length === participantsCount && participantsCount > 0;
  const empty = meal.dishes.length === 0;

  return (
    <GlassCard padding={false}>
      <div
        role="button"
        tabIndex={0}
        className="p-3.5 flex items-center gap-3 cursor-pointer active:bg-white/4 transition-colors"
      >
        <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-2xl shrink-0">
          {cfg.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-slate-100 truncate">
            {meal.title}
          </p>
          {empty ? (
            <p className="text-sm text-slate-500 mt-0.5">Aucun plat — à compléter</p>
          ) : (
            <p className="text-sm text-slate-400 truncate mt-0.5">
              {meal.dishes.map((d) => d.name).join(" · ")}
            </p>
          )}
          {involved.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
              <Users size={11} />
              {everyone ? (
                <span>Tout le monde</span>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {involved.map((p) => (
                    <span key={p.id} className="flex items-center gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <ChevronRight size={16} className="text-slate-600 shrink-0" />
      </div>
    </GlassCard>
  );
}
