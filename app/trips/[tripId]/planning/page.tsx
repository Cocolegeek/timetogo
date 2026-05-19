"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Map,
  Clock,
  MapPin,
  Hourglass,
  MoreVertical,
  Pencil,
  Trash2,
  CalendarDays,
  Route,
  Car,
  PersonStanding,
  Bike,
  Bus,
  Plane,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { GlassCard } from "@/components/layout/GlassCard";
import { useOpenLocation } from "@/components/shared/MapAppPicker";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { DayHeader } from "@/components/shared/DayHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useTrip } from "@/hooks/useTrip";
import { useItinerary } from "@/hooks/useItinerary";
import { isVoyage } from "@/lib/trip-features";
import dynamic from "next/dynamic";
import type { ItineraryFormValues } from "@/components/planning/ItineraryItemForm";
const ItineraryItemForm = dynamic(() => import("@/components/planning/ItineraryItemForm").then(m => ({ default: m.ItineraryItemForm })), { ssr: false });
const JourneyForm = dynamic(() => import("@/components/planning/JourneyForm").then(m => ({ default: m.JourneyForm })), { ssr: false });
import { ParticipantStack } from "@/components/shared/ParticipantStack";
import { eachDate } from "@/lib/meals/slots";
import { formatDuration } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type { ItineraryItem, ItineraryType, JourneyMode, Participant } from "@/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface PlanningPageProps {
  params: Promise<{ tripId: string }>;
}

const TYPE_CONFIG: Record<
  ItineraryType,
  { label: string; color: string; bg: string }
> = {
  transport:     { label: "Transport",   color: "text-sky-400",     bg: "bg-sky-400/10"     },
  accommodation: { label: "Hébergement", color: "text-violet-400",  bg: "bg-violet-400/10"  },
  activity:      { label: "Activité",    color: "text-emerald-400", bg: "bg-emerald-400/10" },
  food:          { label: "Resto",       color: "text-amber-400",   bg: "bg-amber-400/10"   },
  other:         { label: "Autre",       color: "text-slate-400",   bg: "bg-slate-400/10"   },
  journey:       { label: "Trajet",      color: "text-sky-400",     bg: "bg-sky-400/10"     },
};

const JOURNEY_MODE_ICON: Record<JourneyMode, React.ComponentType<{ size?: number; className?: string }>> = {
  car:     Car,
  foot:    PersonStanding,
  bike:    Bike,
  transit: Bus,
  plane:   Plane,
};

export default function PlanningPage({ params }: PlanningPageProps) {
  const { tripId } = use(params);
  const router = useRouter();
  const { trip } = useTrip(tripId);
  const { items, loading, addItem, updateItem, deleteItem } =
    useItinerary(tripId);

  useEffect(() => {
    if (trip && !isVoyage(trip)) {
      router.replace(`/trips/${tripId}/budget`);
    }
  }, [trip, tripId, router]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState<string | undefined>();

  const [formOpen, setFormOpen] = useState(false);
  const [journeyFormOpen, setJourneyFormOpen] = useState(false);
  const [formDefaultDate, setFormDefaultDate] = useState<string | undefined>();
  const [editingItem, setEditingItem] = useState<ItineraryItem | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<ItineraryItem | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const todayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || !trip) return;
    const el = todayRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }, [loading, trip?.id]);

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
    if (item.type === "journey") {
      setJourneyFormOpen(true);
    } else {
      setFormOpen(true);
    }
  };

  const handleSubmit = async (values: ItineraryFormValues) => {
    if (editingItem) {
      await updateItem(editingItem.id, values);
    } else {
      await addItem(values);
    }
    setEditingItem(undefined);
  };

  const performDelete = async () => {
    if (!confirmDelete) return;
    await deleteItem(confirmDelete.id);
    setConfirmDelete(null);
  };

  const byDate = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  const dates = trip && isVoyage(trip) ? eachDate(trip.startDate, trip.endDate) : [];

  return (
    <div className="space-y-5 pt-2">
      {dates.length === 0 ? (
        <EmptyState
          icon={Map}
          title="Aucun jour de voyage"
          description="Vérifie les dates du voyage pour afficher le planning."
        />
      ) : (
        <div className="space-y-6">
          {dates.map((d, idx) => {
            const isToday = d === today;
            const isPast = d < today;
            const dayItems = byDate[d] ?? [];
            return (
              <motion.div
                key={d}
                ref={isToday ? todayRef : undefined}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: isPast ? 0.6 : 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                className="scroll-mt-[calc(env(safe-area-inset-top)+4rem)]"
              >
                <DayHeader date={d} isToday={isToday} isPast={isPast} />
                <div className="relative pl-4 border-l border-foreground/8 space-y-3">
                  <AnimatePresence>
                    {dayItems.map((item) => (
                      <ItineraryCard
                        key={item.id}
                        item={item}
                        participants={trip?.participants ?? []}
                        onEdit={() => openForEdit(item)}
                        onDelete={() => setConfirmDelete(item)}
                        onSwipeDelete={async () => { await deleteItem(item.id); }}
                      />
                    ))}
                  </AnimatePresence>
                  {dayItems.length === 0 && (
                    <button
                      type="button"
                      onClick={() => openPicker(d)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed border-foreground/20 bg-foreground/4 text-slate-400 hover:text-slate-200 hover:border-foreground/35 hover:bg-foreground/8 active:bg-foreground/10 transition-all text-left"
                    >
                      <Plus size={16} className="shrink-0 text-section" />
                      <p className="text-sm font-medium">Rien de prévu ce jour</p>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Type picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="glass-strong border-foreground/10 max-w-xs p-6 gap-4">
          <p className="text-center text-sm font-semibold text-slate-300 uppercase tracking-wider">Ajouter au planning</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={openEventForm}
              className="flex flex-col items-center gap-3 px-4 py-5 rounded-2xl border border-foreground/10 bg-foreground/4 hover:bg-foreground/8 active:scale-95 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                <CalendarDays size={22} className="text-emerald-400" />
              </div>
              <span className="text-sm font-semibold text-slate-200">Événement</span>
            </button>
            <button
              type="button"
              onClick={openJourneyForm}
              className="flex flex-col items-center gap-3 px-4 py-5 rounded-2xl border border-foreground/10 bg-foreground/4 hover:bg-foreground/8 active:scale-95 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-sky-500/15 flex items-center justify-center">
                <Route size={22} className="text-sky-400" />
              </div>
              <span className="text-sm font-semibold text-slate-200">Trajet</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event form */}
      <ItineraryItemForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) { setEditingItem(undefined); setFormDefaultDate(undefined); }
        }}
        participants={trip?.participants ?? []}
        defaultDate={formDefaultDate ?? (trip && isVoyage(trip) ? trip.startDate : undefined) ?? new Date().toISOString().split("T")[0]}
        initialValues={editingItem}
        onSubmit={handleSubmit}
      />

      {/* Journey form */}
      <JourneyForm
        open={journeyFormOpen}
        onOpenChange={(open) => {
          setJourneyFormOpen(open);
          if (!open) { setEditingItem(undefined); setFormDefaultDate(undefined); }
        }}
        participants={trip?.participants ?? []}
        defaultDate={formDefaultDate ?? (trip && isVoyage(trip) ? trip.startDate : undefined) ?? new Date().toISOString().split("T")[0]}
        initialValues={editingItem}
        onSubmit={handleSubmit}
      />

      {/* FAB */}
      <button
        onClick={() => openPicker()}
        className="fixed right-4 z-30 w-14 h-14 rounded-full gradient-primary text-white shadow-section-strong flex items-center justify-center active:scale-95 hover:scale-105 transition-all"
        style={{ bottom: "var(--fab-bottom)" }}
        aria-label="Nouvelle étape"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* Confirm delete */}
      {confirmDelete && (
        <ConfirmDeleteDialog
          title="Supprimer cette étape ?"
          description={
            <>
              <span className="text-slate-200">{confirmDelete.title}</span> sera
              définitivement supprimée du planning.
            </>
          }
          onCancel={() => setConfirmDelete(null)}
          onConfirm={performDelete}
        />
      )}
    </div>
  );
}

const SWIPE_THRESHOLD = -110;

function ItineraryCard({
  item,
  participants,
  onEdit,
  onDelete,
  onSwipeDelete,
}: {
  item: ItineraryItem;
  participants: Participant[];
  onEdit: () => void;
  onDelete: () => void;
  onSwipeDelete: () => void;
}) {
  const openLocation = useOpenLocation();
  const cfg = TYPE_CONFIG[item.type];
  const durationLabel = formatDuration(item.durationMinutes);
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const bgOpacity = useTransform(x, [SWIPE_THRESHOLD, -10, 0], [1, 0.2, 0]);
  const trashScale = useTransform(x, [SWIPE_THRESHOLD - 20, -40, 0], [1.2, 0.9, 0.6]);

  const handleDragEnd = () => {
    setIsDragging(false);
    if (x.get() <= SWIPE_THRESHOLD) {
      animate(x, -window.innerWidth, {
        duration: 0.25,
        onComplete: () => onSwipeDelete(),
      });
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  };

  const involved =
    item.participantIds && item.participantIds.length > 0
      ? participants.filter((p) => item.participantIds.includes(p.id))
      : [];
  const everyone = involved.length === participants.length && participants.length > 0;
  const isJourney = item.type === "journey";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="relative rounded-xl overflow-hidden"
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
            onClick={() => { if (!isDragging) onEdit(); }}
            onKeyDown={(e) => { if (e.key === "Enter") onEdit(); }}
            className="p-3.5 flex items-start gap-3 cursor-pointer active:bg-foreground/4 transition-colors touch-pan-y select-none"
          >
            {isJourney ? (
              <JourneyCardContent item={item} involved={involved} everyone={everyone} openLocation={openLocation} />
            ) : (
              <EventCardContent item={item} cfg={cfg} durationLabel={durationLabel} involved={involved} everyone={everyone} openLocation={openLocation} />
            )}

            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-foreground/8 active:bg-foreground/12 transition-all focus:outline-none"
                  aria-label="Actions"
                >
                  <MoreVertical size={16} />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="glass-strong border-foreground/10 text-slate-200 min-w-44 bg-slate-900/95 backdrop-blur"
                >
                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={onEdit}>
                    <Pencil size={14} className="text-slate-400" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-red-400"
                    onClick={onDelete}
                    variant="destructive"
                  >
                    <Trash2 size={14} />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

function EventCardContent({
  item,
  cfg,
  durationLabel,
  involved,
  everyone,
  openLocation,
}: {
  item: ItineraryItem;
  cfg: { label: string; color: string; bg: string };
  durationLabel: string | undefined;
  involved: Participant[];
  everyone: boolean;
  openLocation: (q: string, options?: { mode?: ItineraryItem["journeyMode"] }) => void;
}) {
  return (
    <div className="flex-1 min-w-0 pr-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn("text-sm px-2.5 py-0.5 rounded-full font-medium", cfg.bg, cfg.color)}>
          {cfg.label}
        </span>
        {item.time && (
          <span className="flex items-center gap-1.5 text-base text-slate-300 font-medium tabular-nums">
            <Clock size={13} />
            {item.time}
          </span>
        )}
        {durationLabel && (
          <span className="flex items-center gap-1.5 text-base text-slate-300">
            <Hourglass size={13} />
            {durationLabel}
          </span>
        )}
      </div>
      <p className="text-xl font-semibold text-slate-100 leading-tight mt-2">{item.title}</p>
      {item.location && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); openLocation(item.location!); }}
          className="flex items-center gap-1.5 text-base text-slate-400 mt-1.5 hover:text-sky-400 active:text-sky-300 transition-colors"
        >
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">{item.location}</span>
        </button>
      )}
      {item.description && (
        <p className="text-base text-slate-400 mt-1.5">{item.description}</p>
      )}
      {involved.length > 0 && (
        <div className="mt-2.5">
          <ParticipantStack participants={involved} everyone={everyone} />
        </div>
      )}
    </div>
  );
}

function JourneyCardContent({
  item,
  involved,
  everyone,
  openLocation,
}: {
  item: ItineraryItem;
  involved: Participant[];
  everyone: boolean;
  openLocation: (q: string, options?: { mode?: ItineraryItem["journeyMode"] }) => void;
}) {
  const ModeIcon = item.journeyMode ? JOURNEY_MODE_ICON[item.journeyMode] : Route;
  const durationLabel = formatDuration(item.durationMinutes) || undefined;
  const journeyOpts = item.journeyMode ? { mode: item.journeyMode } : undefined;

  return (
    <div className="flex-1 min-w-0 pr-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-sm px-2.5 py-0.5 rounded-full font-medium bg-sky-400/10 text-sky-400">
          <ModeIcon size={12} />
          Trajet
        </span>
        {item.time && (
          <span className="flex items-center gap-1.5 text-base text-slate-300 font-medium tabular-nums">
            <Clock size={13} />
            {item.time}
          </span>
        )}
        {durationLabel && (
          <span className="flex items-center gap-1.5 text-base text-slate-300">
            <Hourglass size={13} />
            {durationLabel}
          </span>
        )}
      </div>

      {/* From → To */}
      <div className="mt-2 space-y-1">
        {item.location && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); openLocation(item.location!, journeyOpts); }}
            className="flex items-center gap-1.5 text-base text-slate-200 font-semibold hover:text-sky-400 transition-colors"
          >
            <MapPin size={13} className="text-slate-500 shrink-0" />
            <span className="truncate">{item.location}</span>
          </button>
        )}
        {item.location && item.destination && (
          <div className="flex items-center gap-1.5 pl-0.5">
            <ArrowRight size={13} className="text-slate-600 shrink-0" />
          </div>
        )}
        {item.destination && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); openLocation(item.destination!, journeyOpts); }}
            className="flex items-center gap-1.5 text-base text-slate-200 font-semibold hover:text-sky-400 transition-colors"
          >
            <MapPin size={13} className="text-sky-500 shrink-0" />
            <span className="truncate">{item.destination}</span>
          </button>
        )}
        {!item.location && !item.destination && (
          <p className="text-xl font-semibold text-slate-100 leading-tight">{item.title}</p>
        )}
      </div>

      {involved.length > 0 && (
        <div className="mt-2.5">
          <ParticipantStack participants={involved} everyone={everyone} />
        </div>
      )}
    </div>
  );
}


