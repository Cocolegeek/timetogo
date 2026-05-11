"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import Link from "next/link";
import { UtensilsCrossed, ChefHat, Users, Plus, Trash2, ArrowLeft } from "lucide-react";
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
import { isVoyage } from "@/lib/trip-features";
import type { Meal, Participant } from "@/types";

interface MenusPageProps {
  params: Promise<{ tripId: string }>;
}

export default function MenusPage({ params }: MenusPageProps) {
  const { tripId } = use(params);
  const router = useRouter();
  const { trip } = useTrip(tripId);
  const dateRange = trip && isVoyage(trip)
    ? { startDate: trip.startDate, endDate: trip.endDate }
    : undefined;
  const { meals, loading, addMeal, updateMeal, deleteMeal } = useMeals(tripId, dateRange);

  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Auto-scroll to today's section once data is loaded
  useEffect(() => {
    if (loading || !trip) return;
    const el = todayRef.current;
    if (!el) return;
    // Wait for next paint so the layout is stable
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }, [loading, trip?.id]);

  useEffect(() => {
    if (trip && !isVoyage(trip)) {
      router.replace(`/trips/${tripId}/budget`);
    }
  }, [trip, tripId, router]);

  if (!trip) {
    return (
      <Spinner />
    );
  }

  if (!isVoyage(trip)) {
    return <Spinner />;
  }

  const dates = eachDate(trip.startDate, trip.endDate);

  // Index meals by `${date}#${slot}` for O(1) lookup
  const mealMap = new Map<string, Meal>();
  for (const m of meals) mealMap.set(`${m.date}#${m.slot}`, m);

  return (
    <div className="space-y-4">
      {/* Back to home */}
      <div className="-mt-1 -mb-2">
        <Link
          href="/trips"
          className="inline-flex items-center justify-center p-2 -ml-2 rounded-xl hover:bg-foreground/8 active:bg-foreground/12 text-slate-400 hover:text-slate-200 transition-all"
          aria-label="Retour à l'accueil"
        >
          <ArrowLeft size={20} />
        </Link>
      </div>

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
                        onDelete={() => deleteMeal(meal.id)}
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
  const isEmpty = !meal.title.trim();
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
          className="w-full text-left px-3.5 py-3.5 rounded-2xl border border-dashed border-foreground/20 bg-foreground/4 hover:border-foreground/35 hover:bg-foreground/8 active:bg-foreground/10 transition-all flex items-center gap-3"
        >
          <Plus size={16} className="text-sky-400 shrink-0" />
          <div>
            <span className={cn("text-sm px-2.5 py-0.5 rounded-full font-medium", slotCfg.bgClass, slotCfg.textClass)}>
              {slotCfg.shortLabel}
            </span>
          </div>
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="relative rounded-2xl overflow-hidden"
    >
      {/* Red gradient revealed on swipe */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-6 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, rgba(239,68,68,0.0) 0%, rgba(239,68,68,0.45) 60%, rgba(220,38,38,0.85) 100%)",
          opacity: bgOpacity,
        }}
      >
        <motion.div className="flex items-center gap-2 text-white" style={{ scale: trashScale }}>
          <Trash2 size={18} />
          <span className="text-sm font-semibold">Supprimer</span>
        </motion.div>
      </motion.div>

      {/* Draggable card */}
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
                {slotCfg.shortLabel}
              </span>
              <span className={cn("text-sm px-2.5 py-0.5 rounded-full font-medium", catCfg.badgeClass)}>
                {catCfg.label}
              </span>
            </div>
            <p className="text-xl font-semibold text-slate-100 leading-tight mt-2">{meal.title}</p>
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

function PlaceholderCard({ slot, onTap }: { slot: SlotConfig; onTap: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
      <button
        type="button"
        onClick={onTap}
        className="w-full text-left px-3.5 py-3.5 rounded-2xl border border-dashed border-foreground/20 bg-foreground/4 hover:border-foreground/35 hover:bg-foreground/8 active:bg-foreground/10 transition-all flex items-center gap-3"
      >
        <Plus size={16} className="text-sky-400 shrink-0" />
        <div>
          <span className={cn("text-sm px-2.5 py-0.5 rounded-full font-medium", slot.bgClass, slot.textClass)}>
            {slot.shortLabel}
          </span>
          <p className="text-sm text-slate-400 mt-1.5">Rien de prévu — tap pour ajouter</p>
        </div>
      </button>
    </motion.div>
  );
}
