"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { UtensilsCrossed, ChefHat, Users, Plus, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/layout/GlassCard";
import { DayHeader } from "@/components/shared/DayHeader";
import { DayTabs } from "@/components/shared/DayTabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { Spinner } from "@/components/shared/Spinner";
import dynamic from "next/dynamic";
const MealEditDialog = dynamic(
  () => import("@/components/menus/MealEditDialog").then((m) => ({ default: m.MealEditDialog })),
  { ssr: false }
);
import { useTrip } from "@/hooks/useTrip";
import { useMeals } from "@/hooks/useMeals";
import { DEFAULT_SLOTS, SLOT_CONFIG, eachDate } from "@/lib/meals/slots";
import { CATEGORY_CONFIG } from "@/lib/meals/categories";
import { cn } from "@/lib/utils";
import { isVoyage } from "@/lib/trip-features";
import type { Meal, MealSlot, Participant } from "@/types";

interface MenusPageProps {
  params: Promise<{ tripId: string }>;
}

export default function MenusPage({ params }: MenusPageProps) {
  const { tripId } = use(params);
  const router = useRouter();
  const { trip } = useTrip(tripId);
  const { meals, loading, addMeal, updateMeal, deleteMeal } = useMeals(tripId);

  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const dates = trip && isVoyage(trip) ? eachDate(trip.startDate, trip.endDate) : [];

  // Default active date = today if in range, else first day
  useEffect(() => {
    if (dates.length === 0 || activeDate) return;
    setActiveDate(dates.includes(today) ? today : dates[0]);
  }, [dates, today, activeDate]);

  useEffect(() => {
    if (trip && !isVoyage(trip)) {
      router.replace(`/trips/${tripId}/budget`);
    }
  }, [trip, tripId, router]);

  if (!trip || !isVoyage(trip)) return <Spinner />;

  // Group meals by date
  const mealsByDate = new Map<string, Meal[]>();
  for (const m of meals) {
    const list = mealsByDate.get(m.date) ?? [];
    list.push(m);
    mealsByDate.set(m.date, list);
  }

  const handleAddMeal = async (date: string, slot: MealSlot) => {
    const newMeal = await addMeal(date, slot);
    setEditingMeal(newMeal);
  };

  const currentDate = activeDate ?? dates[0] ?? today;

  const dayMeals = (mealsByDate.get(currentDate) ?? []).sort(
    (a, b) => a.position - b.position
  );
  const usedSlots = new Set(dayMeals.map((m) => m.slot));
  const availableSlots = DEFAULT_SLOTS.filter((s) => !usedSlots.has(s.slot));
  const isToday = currentDate === today;
  const isPast = currentDate < today;

  return (
    <div className="space-y-4 pt-2">
      {dates.length > 0 && (
        <DayTabs
          dates={dates}
          activeDate={currentDate}
          onChange={setActiveDate}
          today={today}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{
              borderColor: "var(--accent-border)",
              borderTopColor: "var(--accent-400)",
            }}
          />
        </div>
      ) : dates.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Aucun jour de voyage"
          description="Vérifie les dates du voyage pour ajouter des repas."
        />
      ) : (
        <motion.section
          key={currentDate}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: isPast ? 0.7 : 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <DayHeader date={currentDate} isToday={isToday} isPast={isPast} />
          <div className="relative pl-4 border-l border-foreground/8 space-y-2.5">
            <AnimatePresence initial={false}>
              {dayMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  participants={trip.participants}
                  onTap={() => setEditingMeal(meal)}
                  onDelete={() => deleteMeal(meal.id)}
                />
              ))}
            </AnimatePresence>

            {availableSlots.length > 0 && (
              <AddMealRow
                availableSlots={availableSlots.map((s) => s.slot)}
                onPick={(slot) => handleAddMeal(currentDate, slot)}
              />
            )}
          </div>
        </motion.section>
      )}

      <MealEditDialog
        open={editingMeal !== null}
        onOpenChange={(open) => { if (!open) setEditingMeal(null); }}
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

// ─── AddMealRow ──────────────────────────────────────────────────────────────

function AddMealRow({
  availableSlots,
  onPick,
}: {
  availableSlots: MealSlot[];
  onPick: (slot: MealSlot) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3.5 py-3 rounded-2xl border border-dashed border-foreground/15 bg-foreground/3 hover:border-section/40 hover:bg-section/5 active:bg-foreground/10 transition-all flex items-center gap-2.5 text-slate-400 hover:text-section-soft"
      >
        <Plus size={16} className="shrink-0" />
        <span className="text-sm font-medium">Ajouter un repas</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="flex gap-1.5 flex-wrap pt-2">
              {availableSlots.map((slot) => {
                const cfg = SLOT_CONFIG[slot];
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onPick(slot);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95",
                      cfg.bgClass,
                      cfg.textClass,
                      "border-current/30 hover:opacity-100"
                    )}
                  >
                    <span className="text-base leading-none">{cfg.emoji}</span>
                    <span>{cfg.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MealCard ────────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = -110;

function MealCard({
  meal,
  participants,
  onTap,
  onDelete,
}: {
  meal: Meal;
  participants: Participant[];
  onTap: () => void;
  onDelete: () => void;
}) {
  const slotCfg = SLOT_CONFIG[meal.slot];
  const catCfg = CATEGORY_CONFIG[meal.category];
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const bgOpacity = useTransform(x, [SWIPE_THRESHOLD, -10, 0], [1, 0.2, 0]);
  const trashScale = useTransform(x, [SWIPE_THRESHOLD - 20, -40, 0], [1.2, 0.9, 0.6]);

  const handleDragEnd = () => {
    setIsDragging(false);
    if (x.get() <= SWIPE_THRESHOLD) {
      animate(x, -window.innerWidth, {
        duration: 0.25,
        onComplete: () => onDelete(),
      });
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  };

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

  const dishNames = meal.dishes
    .map((d) => d.name.trim())
    .filter((n) => n.length > 0);
  const primaryLabel =
    dishNames.length > 0
      ? dishNames.join(" · ")
      : meal.title?.trim()
        ? meal.title.trim()
        : meal.category === "restaurant"
          ? "Restaurant"
          : "Repas à compléter";
  const subLabel = dishNames.length > 0 && meal.title?.trim() ? meal.title.trim() : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="relative rounded-2xl overflow-hidden"
    >
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-6 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(239,68,68,0.0) 0%, rgba(239,68,68,0.45) 60%, rgba(220,38,38,0.85) 100%)",
          opacity: bgOpacity,
        }}
      >
        <motion.div className="flex items-center gap-2 text-white" style={{ scale: trashScale }}>
          <Trash2 size={18} />
          <span className="text-sm font-semibold">Supprimer</span>
        </motion.div>
      </motion.div>

      <motion.div
        data-no-tab-swipe
        drag="x"
        dragConstraints={{ left: -200, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        dragDirectionLock
        style={{ x }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        <GlassCard padding={false}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => { if (!isDragging) onTap(); }}
            onKeyDown={(e) => { if (e.key === "Enter") onTap(); }}
            className="p-3.5 cursor-pointer active:bg-foreground/4 transition-colors touch-pan-y select-none"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-sm px-2.5 py-0.5 rounded-full font-medium", slotCfg.bgClass, slotCfg.textClass)}>
                {slotCfg.emoji} {slotCfg.shortLabel}
              </span>
              <span className={cn("text-sm px-2.5 py-0.5 rounded-full font-medium", catCfg.badgeClass)}>
                {catCfg.label}
              </span>
            </div>
            <p className="text-lg font-semibold text-slate-100 leading-snug mt-2">
              {primaryLabel}
            </p>
            {subLabel && (
              <p className="text-sm text-slate-400 mt-0.5">{subLabel}</p>
            )}
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
    </motion.div>
  );
}
