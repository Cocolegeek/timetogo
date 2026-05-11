"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, UtensilsCrossed, ChefHat, Users, Plus } from "lucide-react";
import { GlassCard } from "@/components/layout/GlassCard";
import { DayHeader } from "@/components/shared/DayHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Spinner } from "@/components/shared/Spinner";
import dynamic from "next/dynamic";
const MealEditDialog = dynamic(() => import("@/components/menus/MealEditDialog").then(m => ({ default: m.MealEditDialog })), { ssr: false });
import { useTrip } from "@/hooks/useTrip";
import { useMeals } from "@/hooks/useMeals";
import { DEFAULT_SLOTS, SLOT_CONFIG, eachDate, type SlotConfig } from "@/lib/meals/slots";
import { CATEGORY_CONFIG } from "@/lib/meals/categories";
import { cn } from "@/lib/utils";
import type { Meal, Participant } from "@/types";

interface MenusPageProps {
  params: Promise<{ tripId: string }>;
}

export default function MenusPage({ params }: MenusPageProps) {
  const { tripId } = use(params);
  const { trip } = useTrip(tripId);
  const { meals, loading, refetch, addMeal, updateMeal } = useMeals(
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
      <Spinner />
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
          className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-foreground/8 active:bg-foreground/12 transition-all"
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
                animate={{ opacity: isPast ? 0.6 : 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                className="scroll-mt-2"
              >
                <DayHeader date={d} isToday={isToday} isPast={isPast} />
                <div className="relative pl-4 border-l border-foreground/8 space-y-3">
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
                      <PlaceholderCard
                        key={slot.slot}
                        slot={slot}
                        onTap={async () => {
                          const newMeal = await addMeal(d, slot.slot);
                          setEditingMeal(newMeal);
                        }}
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
  const isEmpty = !meal.title.trim();

  const cooks = participants.filter((p) => meal.cookIds.includes(p.id));
  const cookLabel =
    cooks.length === 0
      ? null
      : cooks.length === 1
      ? cooks[0].name
      : cooks.length === participants.length
      ? "Tous"
      : `${cooks.length} pers.`;

  const eatersCount = meal.participantIds.length;
  const eaterLabel =
    eatersCount === 0 || eatersCount === participants.length
      ? "Tous"
      : `${eatersCount} pers.`;

  if (isEmpty) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
      >
        <button
          type="button"
          onClick={onTap}
          className="w-full text-left px-3.5 py-3.5 rounded-2xl border border-dashed border-foreground/20 bg-foreground/4 hover:border-foreground/35 hover:bg-foreground/8 active:bg-foreground/10 transition-all"
        >
          <div className="flex items-center justify-between gap-2">
            <span className={cn("text-sm px-2.5 py-0.5 rounded-full font-medium", slotCfg.bgClass, slotCfg.textClass)}>
              {slotCfg.shortLabel}
            </span>
            <Plus size={16} className="text-sky-400 shrink-0" />
          </div>
          <p className="text-sm text-slate-400 mt-2">Rien de prévu — tap pour ajouter</p>
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
    >
      <GlassCard padding={false}>
        <div
          role="button"
          tabIndex={0}
          onClick={onTap}
          onKeyDown={(e) => { if (e.key === "Enter") onTap(); }}
          className="p-3.5 cursor-pointer active:bg-foreground/4 transition-colors"
        >
          {/* Tags row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-sm px-2.5 py-0.5 rounded-full font-medium", slotCfg.bgClass, slotCfg.textClass)}>
              {slotCfg.shortLabel}
            </span>
            <span className={cn("text-sm px-2.5 py-0.5 rounded-full font-medium", catCfg.badgeClass)}>
              {catCfg.label}
            </span>
          </div>

          <p className="text-xl font-semibold text-slate-100 leading-tight mt-2">
            {meal.title}
          </p>

          <div className="flex items-center gap-3 mt-1.5 text-base text-slate-400">
            {cookLabel && (
              <span className="flex items-center gap-1.5">
                <ChefHat size={13} className="text-amber-400" />
                {cookLabel}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users size={13} />
              {eaterLabel}
            </span>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function PlaceholderCard({ slot, onTap }: { slot: SlotConfig; onTap: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
      <button
        type="button"
        onClick={onTap}
        className="w-full text-left px-3.5 py-3.5 rounded-2xl border border-dashed border-foreground/20 bg-foreground/4 hover:border-foreground/35 hover:bg-foreground/8 active:bg-foreground/10 transition-all"
      >
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-sm px-2.5 py-0.5 rounded-full font-medium", slot.bgClass, slot.textClass)}>
            {slot.shortLabel}
          </span>
          <Plus size={16} className="text-sky-400 shrink-0" />
        </div>
        <p className="text-sm text-slate-400 mt-2">Rien de prévu — tap pour ajouter</p>
      </button>
    </motion.div>
  );
}
