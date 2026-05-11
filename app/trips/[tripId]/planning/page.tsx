"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Map,
  Clock,
  MapPin,
  Hourglass,
  RefreshCw,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { GlassCard } from "@/components/layout/GlassCard";
import { openLocation } from "@/lib/map-apps";
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
import { ParticipantStack } from "@/components/shared/ParticipantStack";
import { eachDate } from "@/lib/meals/slots";
import { formatDuration } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type { ItineraryItem, ItineraryType, Participant } from "@/types";

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
};

export default function PlanningPage({ params }: PlanningPageProps) {
  const { tripId } = use(params);
  const router = useRouter();
  const { trip } = useTrip(tripId);
  const { items, loading, addItem, updateItem, deleteItem, refetch } =
    useItinerary(tripId);

  useEffect(() => {
    if (trip && !isVoyage(trip)) {
      router.replace(`/trips/${tripId}/budget`);
    }
  }, [trip, tripId, router]);

  const [formOpen, setFormOpen] = useState(false);
  const [formDefaultDate, setFormDefaultDate] = useState<string | undefined>();
  const [editingItem, setEditingItem] = useState<ItineraryItem | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<ItineraryItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const openForCreate = (date?: string) => {
    setEditingItem(undefined);
    setFormDefaultDate(date);
    setFormOpen(true);
  };

  const openForEdit = (item: ItineraryItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleSubmit = async (values: ItineraryFormValues) => {
    if (editingItem) {
      await updateItem(editingItem.id, values);
    } else {
      await addItem(values);
    }
    setEditingItem(undefined);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 400);
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
    <div className="space-y-5">
      {/* Refresh action only — title is redundant with bottom nav */}
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
                className="scroll-mt-2"
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
                      onClick={() => openForCreate(d)}
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

      {/* Add / Edit form */}
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

      {/* FAB */}
      <button
        onClick={() => openForCreate()}
        className="fixed right-4 z-30 w-14 h-14 rounded-full gradient-primary text-white shadow-section-strong flex items-center justify-center active:scale-95 hover:scale-105 transition-all"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
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

