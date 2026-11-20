"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";
import { useQuickAdd } from "@/hooks/useQuickAdd";
import { useToast } from "@/components/shared/Toaster";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { UtensilsCrossed, ChefHat, Users, Plus, Trash2, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { DayHeader } from "@/components/shared/DayHeader";
import { DayTabs } from "@/components/shared/DayTabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { Spinner } from "@/components/shared/Spinner";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTrip } from "@/hooks/useTrip";
import { useMeals } from "@/hooks/useMeals";
import { DEFAULT_SLOTS, SLOT_CONFIG, eachDate } from "@/lib/meals/slots";
import { CATEGORY_CONFIG } from "@/lib/meals/categories";
import { COURSE_BY_ID, COURSE_ORDER } from "@/lib/meals/courses";
import { EASE_OUT, fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { isVoyage } from "@/lib/trip-features";
import type { Meal, MealSlot, Participant } from "@/types";

const MealEditDialog = dynamic(
  () => import("@/components/menus/MealEditDialog").then((m) => ({ default: m.MealEditDialog })),
  { ssr: false }
);

interface MenusPageProps {
  params: Promise<{ tripId: string }>;
}

export default function MenusPage({ params }: MenusPageProps) {
  const { tripId } = use(params);
  const router = useRouter();
  const { trip } = useTrip(tripId);
  const { meals: allMeals, loading, addMeal, updateMeal, deleteMeal } = useMeals(tripId);
  const searchParams = useSearchParams();
  const toast = useToast();
  const { pending, remove } = useUndoableDelete(deleteMeal);
  const meals = useMemo(() => allMeals.filter((m) => !pending.has(m.id)), [allMeals, pending]);

  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [slotPickerOpen, setSlotPickerOpen] = useState(searchParams.get("new") === "meal");
  const [selection, setSelection] = useState<{ date: string | null; dir: number }>({
    date: searchParams.get("date"),
    dir: 1,
  });
  const selectedDate = selection.date;
  const dir = selection.dir;

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const dates = useMemo(() => (trip && isVoyage(trip) ? eachDate(trip.startDate, trip.endDate) : []), [trip]);
  const currentDate = selectedDate ?? (dates.includes(today) ? today : dates[0]) ?? today;

  const mealsByDate = useMemo(() => {
    const map = new Map<string, Meal[]>();
    for (const m of meals) map.set(m.date, [...(map.get(m.date) ?? []), m]);
    return map;
  }, [meals]);
  const marked = useMemo(() => new Set(mealsByDate.keys()), [mealsByDate]);

  useQuickAdd((kind) => {
    if (kind === "meal") setSlotPickerOpen(true);
  });

  useEffect(() => {
    if (trip && !isVoyage(trip)) {
      router.replace(`/trips/${tripId}/budget`);
    }
  }, [trip, tripId, router]);

  if (!trip || !isVoyage(trip)) return <Spinner />;

  const selectDate = (d: string) => {
    setSelection({ date: d, dir: d > currentDate ? 1 : -1 });
  };

  const handleAddMeal = async (date: string, slot: MealSlot) => {
    setSlotPickerOpen(false);
    const newMeal = await addMeal(date, slot);
    setEditingMeal(newMeal);
  };

  const dayMeals = [...(mealsByDate.get(currentDate) ?? [])].sort((a, b) => a.position - b.position);
  const usedSlots = new Set(dayMeals.map((m) => m.slot));
  const availableSlots = DEFAULT_SLOTS.filter((s) => !usedSlots.has(s.slot));

  return (
    <div className="space-y-3 pt-1">
      <PageHeader eyebrow={trip.name} title="Menus" />

      {dates.length > 0 && (
        <DayTabs id="menus" dates={dates} activeDate={currentDate} onChange={selectDate} today={today} marked={marked} />
      )}

      {loading ? (
        <Spinner />
      ) : dates.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="Aucun jour de voyage" description="Vérifie les dates du voyage pour ajouter des repas." />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={currentDate}
            initial={{ opacity: 0, x: 28 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 * dir }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="pt-2"
          >
            <DayHeader date={currentDate} isToday={currentDate === today} isPast={currentDate < today} />

            <motion.ul variants={stagger(0.05)} initial="hidden" animate="show" className="space-y-3">
              <AnimatePresence initial={false}>
                {dayMeals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    participants={trip.participants}
                    onTap={() => setEditingMeal(meal)}
                    onDelete={() => remove(meal.id, "Repas supprimé")}
                  />
                ))}
              </AnimatePresence>
            </motion.ul>

            {dayMeals.length === 0 && (
              <p className="mb-4 px-1 text-[0.95rem] text-muted-foreground">Rien de prévu pour ce jour. Choisis un repas à organiser :</p>
            )}

            {availableSlots.length > 0 && (
              <div className={cn("flex flex-wrap gap-2", dayMeals.length > 0 && "mt-4")}>
                {availableSlots.map((cfg) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={cfg.slot}
                      type="button"
                      onClick={() => handleAddMeal(currentDate, cfg.slot)}
                      className="pressable flex h-11 items-center gap-2 rounded-full border border-dashed border-foreground/20 pr-4 pl-3 text-sm font-semibold transition-colors hover:border-foreground/35"
                    >
                      <Plus size={15} className="text-muted-foreground" />
                      <Icon size={16} className={cfg.textClass} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      )}

      <Dialog open={slotPickerOpen} onOpenChange={setSlotPickerOpen}>
        <DialogContent className="max-w-sm">
          <div className="space-y-1 pr-10">
            <DialogTitle>Ajouter un repas</DialogTitle>
            <DialogDescription className="first-letter:uppercase">
              {new Date(currentDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </DialogDescription>
          </div>
          {availableSlots.length === 0 ? (
            <p className="text-[0.95rem] text-muted-foreground">Tous les repas de ce jour sont déjà prévus.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {availableSlots.map((cfg) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={cfg.slot}
                    type="button"
                    onClick={() => handleAddMeal(currentDate, cfg.slot)}
                    className="pressable flex flex-col items-start gap-3 rounded-[1.25rem] bg-secondary p-4 text-left transition-colors hover:bg-foreground/[0.08]"
                  >
                    <span className={cn("flex size-10 items-center justify-center rounded-2xl", cfg.bgClass, cfg.textClass)}>
                      <Icon size={19} />
                    </span>
                    <span className="font-semibold">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MealEditDialog
        open={editingMeal !== null}
        onOpenChange={(open) => { if (!open) setEditingMeal(null); }}
        meal={editingMeal}
        participants={trip.participants}
        onSave={async (data) => {
          if (!editingMeal) return;
          await updateMeal(editingMeal.id, data);
          toast({ message: "Repas enregistré", tone: "success" });
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
  const SlotIcon = slotCfg.icon;
  const x = useMotionValue(0);
  const dragged = useRef(false);
  const revealOpacity = useTransform(x, [SWIPE_THRESHOLD, -24, 0], [1, 0.4, 0]);
  const trashScale = useTransform(x, [SWIPE_THRESHOLD - 20, -40, 0], [1.15, 0.85, 0.6]);

  const handleDragEnd = () => {
    if (x.get() <= SWIPE_THRESHOLD) {
      animate(x, -window.innerWidth, { duration: 0.22, ease: [0.4, 0, 1, 1], onComplete: () => onDelete() });
    } else {
      animate(x, 0, { type: "spring", stiffness: 520, damping: 38 });
    }
    setTimeout(() => (dragged.current = false), 0);
  };

  const cooks = participants.filter((p) => meal.cookIds.includes(p.id));
  const eatersCount = meal.participantIds.length;
  const eaterLabel = eatersCount === 0 || eatersCount === participants.length ? "Tout le monde" : `${eatersCount} pers.`;

  const dishes = [...meal.dishes]
    .filter((d) => d.name.trim().length > 0)
    .sort((a, b) => COURSE_ORDER.indexOf(a.course) - COURSE_ORDER.indexOf(b.course));
  const note = meal.title?.trim();

  return (
    <motion.li
      layout="position"
      variants={fadeUp}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.25, ease: EASE_OUT } }}
      className="relative overflow-hidden rounded-[1.5rem] shadow-card"
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-end bg-red-500 pr-6 text-white"
        style={{ opacity: revealOpacity }}
      >
        <motion.span className="flex items-center gap-2 text-sm font-semibold" style={{ scale: trashScale }}>
          <Trash2 size={18} />
          Supprimer
        </motion.span>
      </motion.div>

      <motion.button
        type="button"
        data-no-tab-swipe
        drag="x"
        dragConstraints={{ left: -200, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        dragDirectionLock
        style={{ x }}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (!dragged.current) onTap();
        }}
        className="relative block w-full touch-pan-y rounded-[1.5rem] bg-card p-4 text-left outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="flex items-center gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl", slotCfg.bgClass, slotCfg.textClass)}>
            <SlotIcon size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[1.05rem] font-bold tracking-tight">{slotCfg.label}</span>
            {note && <span className="block truncate text-sm text-muted-foreground">{note}</span>}
          </span>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", catCfg.badgeClass)}>{catCfg.label}</span>
          <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
        </span>

        {dishes.length > 0 ? (
          <span className="mt-3 block space-y-1.5 border-t border-border pt-3">
            {dishes.map((dish) => (
              <span key={dish.id} className="flex items-baseline gap-3">
                <span className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">{COURSE_BY_ID[dish.course].label}</span>
                <span className="min-w-0 flex-1 text-[0.95rem] font-medium">{dish.name}</span>
              </span>
            ))}
          </span>
        ) : (
          !note && <span className="mt-3 block border-t border-border pt-3 text-sm text-muted-foreground">Touche pour composer le repas.</span>
        )}

        <span className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          {cooks.length > 0 && (
            <span className="flex items-center gap-1.5">
              <ChefHat size={15} />
              <span className="flex -space-x-1.5">
                {cooks.slice(0, 3).map((c) => (
                  <ParticipantAvatar key={c.id} participant={c} size="xs" />
                ))}
              </span>
              {cooks.length === 1 ? cooks[0].name : `${cooks.length} en cuisine`}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users size={15} />
            {eaterLabel}
          </span>
        </span>
      </motion.button>
    </motion.li>
  );
}
