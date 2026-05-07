"use client";

import { use, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Plus,
  UtensilsCrossed,
  ChevronRight,
} from "lucide-react";
import { GlassCard } from "@/components/layout/GlassCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MealEditDialog } from "@/components/menus/MealEditDialog";
import { ParticipantStack } from "@/components/shared/ParticipantStack";
import { useTrip } from "@/hooks/useTrip";
import { useMeals } from "@/hooks/useMeals";
import { SLOT_CONFIG, eachDate } from "@/lib/meals/slots";
import { cn } from "@/lib/utils";
import type { Meal, MealSlot, Participant } from "@/types";

interface MenusPageProps {
  params: Promise<{ tripId: string }>;
}

const EXTRA_SLOT_OPTIONS: { slot: MealSlot; title: string; emoji: string }[] = [
  { slot: "apero", title: "Apéro", emoji: "🍷" },
  { slot: "snack", title: "Goûter", emoji: "🍪" },
  { slot: "extra", title: "Repas", emoji: "🍴" },
];

export default function MenusPage({ params }: MenusPageProps) {
  const { tripId } = use(params);
  const { trip } = useTrip(tripId);
  const { meals, loading, refetch, updateMeal, addExtraMeal, deleteMeal } =
    useMeals(
      tripId,
      trip ? { startDate: trip.startDate, endDate: trip.endDate } : undefined
    );

  const [refreshing, setRefreshing] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [addExtraDate, setAddExtraDate] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 400);
  };

  const handleAddExtra = async (slot: MealSlot, title: string) => {
    if (!addExtraDate) return;
    await addExtraMeal(addExtraDate, slot, title);
    setAddExtraDate(null);
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
                      "text-sm font-semibold uppercase tracking-wider flex items-center gap-2",
                      isToday ? "text-indigo-300" : "text-slate-400"
                    )}
                  >
                    {new Date(d).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                    {isToday && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold tracking-normal">
                        AUJ.
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setAddExtraDate(d)}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/8 transition-colors"
                  >
                    <Plus size={12} />
                    Repas
                  </button>
                </div>

                <div className="space-y-2">
                  <AnimatePresence>
                    {dayMeals.map((m) => (
                      <motion.div
                        key={m.id}
                        layout
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <MealRow
                          meal={m}
                          participants={trip.participants}
                          onTap={() => setEditingMeal(m)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
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
        onDelete={
          editingMeal
            ? async () => {
                await deleteMeal(editingMeal.id);
              }
            : undefined
        }
      />

      {/* Add extra meal chooser */}
      <Dialog
        open={addExtraDate !== null}
        onOpenChange={(open) => {
          if (!open) setAddExtraDate(null);
        }}
      >
        <DialogContent className="glass-strong border-white/10 max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-slate-100 text-lg">
              Ajouter un repas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            {EXTRA_SLOT_OPTIONS.map((opt) => (
              <button
                key={opt.slot + opt.title}
                type="button"
                onClick={() => handleAddExtra(opt.slot, opt.title)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.99] transition-all text-left"
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="text-base font-medium text-slate-100">
                  {opt.title}
                </span>
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            onClick={() => setAddExtraDate(null)}
            className="text-slate-400 hover:bg-white/8 mt-2"
          >
            Annuler
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MealRow({
  meal,
  participants,
  onTap,
}: {
  meal: Meal;
  participants: Participant[];
  onTap: () => void;
}) {
  const cfg = SLOT_CONFIG[meal.slot];
  const involved = participants.filter((p) =>
    meal.participantIds.includes(p.id)
  );
  const everyone =
    involved.length === participants.length && participants.length > 0;
  const empty = meal.dishes.length === 0;

  return (
    <GlassCard padding={false}>
      <div
        role="button"
        tabIndex={0}
        onClick={onTap}
        onKeyDown={(e) => {
          if (e.key === "Enter") onTap();
        }}
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
            <p className="text-sm text-slate-500 mt-0.5">
              Aucun plat — à compléter
            </p>
          ) : (
            <p className="text-sm text-slate-400 truncate mt-0.5">
              {meal.dishes.map((d) => d.name).join(" · ")}
            </p>
          )}
          {involved.length > 0 && (
            <div className="mt-1.5">
              <ParticipantStack
                participants={involved}
                everyone={everyone}
              />
            </div>
          )}
        </div>

        <ChevronRight size={16} className="text-slate-600 shrink-0" />
      </div>
    </GlassCard>
  );
}
