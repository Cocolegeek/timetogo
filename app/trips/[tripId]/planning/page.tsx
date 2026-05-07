"use client";

import { use, useState } from "react";
import {
  Plus,
  Map,
  Clock,
  Hourglass,
  RefreshCw,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/layout/GlassCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTrip } from "@/hooks/useTrip";
import { useItinerary } from "@/hooks/useItinerary";
import {
  ItineraryItemForm,
  type ItineraryFormValues,
} from "@/components/planning/ItineraryItemForm";
import { ParticipantStack } from "@/components/shared/ParticipantStack";
import { AddressLink } from "@/components/shared/AddressLink";
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
  const { trip } = useTrip(tripId);
  const { items, addItem, updateItem, deleteItem, refetch } =
    useItinerary(tripId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<ItineraryItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const openForCreate = () => {
    setEditingItem(undefined);
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

  return (
    <div className="space-y-5">
      {/* Refresh action only — title is redundant with bottom nav */}
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

      {items.length === 0 ? (
        <EmptyState
          icon={Map}
          title="Itinéraire vide"
          description="Ajoute des étapes pour construire ton planning de voyage."
          action={
            <Button
              onClick={openForCreate}
              className="gradient-primary text-white border-0"
            >
              <Plus size={16} />
              Ajouter une étape
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(byDate).map(([d, dayItems]) => (
            <div key={d}>
              <p className="text-sm text-slate-400 font-semibold mb-3 uppercase tracking-wider">
                {new Date(d).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <div className="relative pl-4 border-l border-white/8 space-y-3">
                <AnimatePresence>
                  {dayItems.map((item) => (
                    <ItineraryCard
                      key={item.id}
                      item={item}
                      participants={trip?.participants ?? []}
                      onEdit={() => openForEdit(item)}
                      onDelete={() => setConfirmDelete(item)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      <ItineraryItemForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingItem(undefined);
        }}
        participants={trip?.participants ?? []}
        defaultDate={trip?.startDate ?? new Date().toISOString().split("T")[0]}
        initialValues={editingItem}
        onSubmit={handleSubmit}
      />

      {/* FAB */}
      <button
        onClick={openForCreate}
        className="fixed right-4 z-30 w-14 h-14 rounded-full gradient-primary text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center active:scale-95 hover:scale-105 transition-all"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
        aria-label="Nouvelle étape"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* Confirm delete */}
      {confirmDelete && (
        <ConfirmDelete
          itemTitle={confirmDelete.title}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={performDelete}
        />
      )}
    </div>
  );
}

function ItineraryCard({
  item,
  participants,
  onEdit,
  onDelete,
}: {
  item: ItineraryItem;
  participants: Participant[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cfg = TYPE_CONFIG[item.type];
  const durationLabel = formatDuration(item.durationMinutes);

  // Resolve participants involved in this step
  const involved =
    item.participantIds && item.participantIds.length > 0
      ? participants.filter((p) => item.participantIds.includes(p.id))
      : [];
  const everyone = involved.length === participants.length && participants.length > 0;

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
          onClick={onEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEdit();
          }}
          className="p-3.5 flex items-start gap-3 cursor-pointer active:bg-white/4 transition-colors"
        >
          <div className="flex-1 min-w-0 pr-1">
            {/* Tags row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  cfg.bg,
                  cfg.color
                )}
              >
                {cfg.label}
              </span>
              {item.time && (
                <span className="flex items-center gap-1 text-sm text-slate-400">
                  <Clock size={12} />
                  {item.time}
                </span>
              )}
              {durationLabel && (
                <span className="flex items-center gap-1 text-sm text-slate-400">
                  <Hourglass size={12} />
                  {durationLabel}
                </span>
              )}
            </div>

            <p className="text-base font-semibold text-slate-100 mt-1.5">
              {item.title}
            </p>

            {item.location && (
              <div className="mt-1.5">
                <AddressLink address={item.location} compact />
              </div>
            )}
            {item.description && (
              <p className="text-sm text-slate-500 mt-1">{item.description}</p>
            )}

            {/* Participants — visible avatar stack */}
            {involved.length > 0 && (
              <div className="mt-2.5">
                <ParticipantStack
                  participants={involved}
                  everyone={everyone}
                />
              </div>
            )}
          </div>

          {/* Actions menu — stop click from bubbling to the card */}
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/8 active:bg-white/12 transition-all focus:outline-none"
                aria-label="Actions"
              >
                <MoreVertical size={16} />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="glass-strong border-white/10 text-slate-200 min-w-44 bg-slate-900/95 backdrop-blur"
              >
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={onEdit}
                >
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
  );
}

function ConfirmDelete({
  itemTitle,
  onCancel,
  onConfirm,
}: {
  itemTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong border border-white/10 rounded-2xl p-5 max-w-sm w-full space-y-4"
      >
        <div>
          <h3 className="text-lg font-bold text-slate-100">
            Supprimer cette étape&nbsp;?
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            <span className="text-slate-200">{itemTitle}</span> sera
            définitivement supprimée du planning.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 h-11 rounded-lg bg-white/5 hover:bg-white/8 text-slate-300 text-sm font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={async () => {
              setDeleting(true);
              await onConfirm();
              setDeleting(false);
            }}
            disabled={deleting}
            className="flex-1 h-11 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-semibold border border-red-500/30 transition-colors disabled:opacity-50"
          >
            {deleting ? "…" : "Supprimer"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
