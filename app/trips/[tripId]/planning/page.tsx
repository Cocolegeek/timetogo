"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import {
  Map,
  MapPin,
  Trash2,
  CalendarPlus,
  Route,
  Hourglass,
  Navigation,
  Sun,
} from "lucide-react";
import { m as motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useOpenLocation, useOpenRoute } from "@/components/shared/MapAppPicker";
import { DayHeader } from "@/components/shared/DayHeader";
import { DayTabs } from "@/components/shared/DayTabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { ParticipantStack } from "@/components/shared/ParticipantStack";
import { useToast } from "@/components/shared/Toaster";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";
import { useQuickAdd } from "@/hooks/useQuickAdd";
import { PageHeader } from "@/components/layout/PageHeader";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTrip } from "@/hooks/useTrip";
import { useItinerary } from "@/hooks/useItinerary";
import { tripDays } from "@/lib/trip-days";
import { ITINERARY_TYPES, JOURNEY_MODES, itemTitle } from "@/lib/itinerary-types";
import { formatDuration } from "@/lib/format-date";
import { EASE_OUT, fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { HoverActions } from "@/components/shared/HoverActions";
import type { ItineraryFormValues } from "@/components/planning/ItineraryItemForm";
import type { ItineraryItem, Participant } from "@/types";

const ItineraryItemForm = dynamic(() => import("@/components/planning/ItineraryItemForm").then((m) => ({ default: m.ItineraryItemForm })), { ssr: false });
const JourneyForm = dynamic(() => import("@/components/planning/JourneyForm").then((m) => ({ default: m.JourneyForm })), { ssr: false });

interface PlanningPageProps {
  params: Promise<{ tripId: string }>;
}

export default function PlanningPage({ params }: PlanningPageProps) {
  const { tripId } = use(params);
  const { trip } = useTrip(tripId);
  const { items: allItems, addItem, updateItem, deleteItem } = useItinerary(tripId);
  const searchParams = useSearchParams();
  const toast = useToast();
  const { pending, remove } = useUndoableDelete(deleteItem);
  const items = useMemo(() => allItems.filter((i) => !pending.has(i.id)), [allItems, pending]);
  const highlightId = searchParams.get("item");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(searchParams.get("new") === "step");
  const [journeyFormOpen, setJourneyFormOpen] = useState(searchParams.get("new") === "journey");
  const [formDefaultDate, setFormDefaultDate] = useState<string | undefined>();
  const [editingItem, setEditingItem] = useState<ItineraryItem | undefined>();
  const [selection, setSelection] = useState<{ date: string | null; dir: number }>({
    date: searchParams.get("date"),
    dir: 1,
  });
  const selectedDate = selection.date;
  const dir = selection.dir;

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const dates = useMemo(() => tripDays(trip ?? {}, allItems.map((i) => i.date), today), [trip, allItems, today]);
  const currentDate = selectedDate ?? (dates.includes(today) ? today : dates[0]) ?? today;

  const byDate = useMemo(
    () =>
      items.reduce<Record<string, ItineraryItem[]>>((acc, item) => {
        (acc[item.date] ??= []).push(item);
        return acc;
      }, {}),
    [items]
  );
  const marked = useMemo(() => new Set(Object.keys(byDate)), [byDate]);

  const selectDate = (d: string) => {
    setSelection({ date: d, dir: d > currentDate ? 1 : -1 });
  };

  useQuickAdd((kind) => {
    if (kind !== "step" && kind !== "journey") return;
    setEditingItem(undefined);
    setFormDefaultDate(currentDate);
    if (kind === "step") setFormOpen(true);
    else setJourneyFormOpen(true);
  });

  const openPicker = (date?: string) => {
    setPickerDate(date);
    setPickerOpen(true);
  };

  const openEventForm = () => {
    setPickerOpen(false);
    setEditingItem(undefined);
    setFormDefaultDate(pickerDate);
    setFormOpen(true);
  };

  const openJourneyForm = () => {
    setPickerOpen(false);
    setEditingItem(undefined);
    setFormDefaultDate(pickerDate);
    setJourneyFormOpen(true);
  };

  const openForEdit = (item: ItineraryItem) => {
    setEditingItem(item);
    setFormDefaultDate(item.date);
    if (item.type === "journey") setJourneyFormOpen(true);
    else setFormOpen(true);
  };

  const handleSubmit = async (values: ItineraryFormValues) => {
    if (editingItem) {
      await updateItem(editingItem.id, values);
      toast({ message: "Étape modifiée", tone: "success" });
    } else {
      await addItem(values);
      toast({
        message: "Ajouté au planning",
        tone: "success",
        action: {
          label: "Ajouter un autre",
          onClick: () => {
            setEditingItem(undefined);
            setFormDefaultDate(values.date);
            if (values.type === "journey") setJourneyFormOpen(true);
            else setFormOpen(true);
          },
        },
      });
    }
    setEditingItem(undefined);
  };

  const dayItems = byDate[currentDate] ?? [];
  const participants = trip?.participants ?? [];
  const fallbackDate = formDefaultDate ?? currentDate;

  return (
    <div className="space-y-3 pt-1">
      <PageHeader eyebrow={trip?.name} title="Planning" />

      {dates.length > 0 && (
        <DayTabs id="planning" dates={dates} activeDate={currentDate} onChange={selectDate} today={today} marked={marked} />
      )}

      {dates.length === 0 ? (
        <EmptyState icon={Map} title="Aucun jour de voyage" description="Vérifie les dates du voyage pour afficher le planning." />
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

            {dayItems.length === 0 ? (
              <button
                type="button"
                onClick={() => openPicker(currentDate)}
                className="pressable flex w-full flex-col items-center gap-3 rounded-[1.5rem] border border-dashed border-foreground/20 px-6 py-10 text-center transition-colors hover:border-foreground/35"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                  <Sun size={22} />
                </span>
                <span className="font-display text-lg font-bold tracking-tight">Journée libre</span>
                <span className="text-sm text-muted-foreground">Ajoute une activité, un resto ou un trajet.</span>
              </button>
            ) : (
              <motion.ol variants={stagger(0.05)} initial="hidden" animate="show" className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {dayItems.map((item, i) => (
                    <TimelineRow key={item.id} item={item} last={i === dayItems.length - 1}>
                      <ItineraryCard
                        item={item}
                        participants={participants}
                        onEdit={() => openForEdit(item)}
                        highlight={item.id === highlightId}
                        onSwipeDelete={() => remove(item.id, "Étape supprimée")}
                      />
                    </TimelineRow>
                  ))}
                </AnimatePresence>
              </motion.ol>
            )}
          </motion.section>
        </AnimatePresence>
      )}


      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-sm">
          <div className="space-y-1 pr-10">
            <DialogTitle>Ajouter au planning</DialogTitle>
            <DialogDescription>Une étape sur place ou un déplacement entre deux lieux.</DialogDescription>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PickerOption icon={CalendarPlus} tile="bg-emerald-500/12 text-emerald-400" label="Étape" hint="Activité, resto, logement" onClick={openEventForm} />
            <PickerOption icon={Route} tile="bg-sky-500/12 text-sky-400" label="Trajet" hint="D'un lieu à l'autre" onClick={openJourneyForm} />
          </div>
        </DialogContent>
      </Dialog>

      <ItineraryItemForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingItem(undefined);
            setFormDefaultDate(undefined);
          }
        }}
        participants={participants}
        defaultDate={fallbackDate}
        initialValues={editingItem}
        onSubmit={handleSubmit}
        onDelete={editingItem ? () => remove(editingItem.id, "Étape supprimée") : undefined}
      />

      <JourneyForm
        open={journeyFormOpen}
        onOpenChange={(open) => {
          setJourneyFormOpen(open);
          if (!open) {
            setEditingItem(undefined);
            setFormDefaultDate(undefined);
          }
        }}
        participants={participants}
        defaultDate={fallbackDate}
        initialValues={editingItem}
        onSubmit={handleSubmit}
        onDelete={editingItem ? () => remove(editingItem.id, "Étape supprimée") : undefined}
      />

    </div>
  );
}

function PickerOption({
  icon: Icon,
  tile,
  label,
  hint,
  onClick,
}: {
  icon: typeof Route;
  tile: string;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable flex flex-col items-start gap-3 rounded-[1.25rem] bg-secondary p-4 text-left transition-colors hover:bg-foreground/[0.08]"
    >
      <span className={cn("flex size-11 items-center justify-center rounded-2xl", tile)}>
        <Icon size={22} />
      </span>
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

function TimelineRow({ item, last, children }: { item: ItineraryItem; last: boolean; children: React.ReactNode }) {
  return (
    <motion.li
      layout="position"
      variants={fadeUp}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.25, ease: EASE_OUT } }}
      className="relative grid grid-cols-[3rem_minmax(0,1fr)] gap-3"
    >
      <span className="tabular pt-4 text-right text-sm font-semibold text-muted-foreground">
        {item.time ? item.time.slice(0, 5) : "-"}
      </span>
      <div className="relative">
        {!last && <span aria-hidden="true" className="absolute top-full left-6 h-2.5 w-px bg-border" />}
        {children}
      </div>
    </motion.li>
  );
}

const SWIPE_THRESHOLD = -110;

function ItineraryCard({
  item,
  participants,
  onEdit,
  onSwipeDelete,
  highlight,
}: {
  highlight?: boolean;
  item: ItineraryItem;
  participants: Participant[];
  onEdit: () => void;
  onSwipeDelete: () => void;
}) {
  const openLocation = useOpenLocation();
  const openRoute = useOpenRoute();
  const x = useMotionValue(0);
  const dragged = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const revealOpacity = useTransform(x, [SWIPE_THRESHOLD, -24, 0], [1, 0.4, 0]);
  const trashScale = useTransform(x, [SWIPE_THRESHOLD - 20, -40, 0], [1.15, 0.85, 0.6]);

  useEffect(() => {
    if (highlight) rootRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight]);

  const handleDragEnd = () => {
    if (x.get() <= SWIPE_THRESHOLD) {
      animate(x, -window.innerWidth, { duration: 0.22, ease: [0.4, 0, 1, 1], onComplete: () => onSwipeDelete() });
    } else {
      animate(x, 0, { type: "spring", stiffness: 520, damping: 38 });
    }
    setTimeout(() => (dragged.current = false), 0);
  };

  const involved = item.participantIds?.length ? participants.filter((p) => item.participantIds.includes(p.id)) : [];
  const everyone = involved.length === participants.length && participants.length > 0;
  const isJourney = item.type === "journey";
  const cfg = ITINERARY_TYPES[item.type];
  const Icon = isJourney && item.journeyMode ? JOURNEY_MODES[item.journeyMode].icon : cfg.icon;
  const duration = formatDuration(item.durationMinutes);
  const journeyOpts = item.journeyMode ? { mode: item.journeyMode } : undefined;

  return (
    <div
      ref={rootRef}
      className={cn(
        "group relative scroll-mt-40 overflow-hidden rounded-[1.25rem] transition-[outline-color] duration-500",
        !isJourney && "shadow-card",
        highlight && "outline-2 outline-offset-2 outline-primary"
      )}
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

      <motion.div
        data-no-tab-swipe
        drag="x"
        dragConstraints={{ left: -200, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        dragDirectionLock
        style={{ x }}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={handleDragEnd}
        className={cn(
          "relative flex touch-pan-y items-start gap-3 rounded-[1.25rem] p-3.5 select-none",
          isJourney ? "bg-[color-mix(in_oklch,var(--color-sky-500)_10%,var(--card))] ring-1 ring-sky-500/15 ring-inset" : "bg-card"
        )}
      >
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", isJourney ? "bg-sky-500/15 text-sky-400" : cfg.tile)}>
          <Icon size={20} />
        </span>

        <button
          type="button"
          onClick={() => {
            if (!dragged.current) onEdit();
          }}
          className="min-w-0 flex-1 pt-0.5 text-left outline-none"
        >
          <span className="block text-[1rem] leading-snug font-semibold [overflow-wrap:anywhere]">{itemTitle(item)}</span>
          {!isJourney && item.location ? (
            <span className="mt-0.5 block truncate text-sm text-muted-foreground">{item.location}</span>
          ) : null}
          {item.description && <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>}

          {(duration || (involved.length > 0 && !everyone)) && (
            <span className="mt-2.5 flex flex-wrap items-center gap-2">
              {duration && (
                <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  <Hourglass size={12} />
                  {duration}
                </span>
              )}
              {involved.length > 0 && !everyone && <ParticipantStack participants={involved} />}
            </span>
          )}
        </button>

        <div className="-my-0.5 -mr-1 flex shrink-0 items-center self-center">
          {(isJourney ? item.location && item.destination : item.location) && (
            <button
              type="button"
              onClick={() =>
                isJourney
                  ? openRoute(item.location!, item.destination!, journeyOpts)
                  : openLocation(item.location!)
              }
              className={cn(
                "flex size-11 items-center justify-center rounded-full transition-colors",
                isJourney ? "bg-sky-500/12 text-sky-400 hover:bg-sky-500/20" : "bg-secondary text-foreground hover:bg-foreground/[0.08]"
              )}
              aria-label={isJourney ? "Voir l'itinéraire" : `Ouvrir ${item.location} dans une app de cartes`}
            >
              {isJourney ? <Navigation size={18} /> : <MapPin size={18} />}
            </button>
          )}
        </div>
      </motion.div>

      <HoverActions
        label={itemTitle(item)}
        onEdit={onEdit}
        onDelete={onSwipeDelete}
        className={cn("absolute top-2", (isJourney ? item.location && item.destination : item.location) ? "right-16" : "right-2")}
      />
    </div>
  );
}
