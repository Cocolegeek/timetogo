"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Plane, RefreshCw } from "lucide-react";
import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { TripCard } from "@/components/trips/TripCard";
import { TripEditWrapper } from "@/components/trips/TripEditWrapper";
import { TodayPlanningBlock } from "@/components/trips/TodayPlanningBlock";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserMenu } from "@/components/layout/UserMenu";
import { buttonVariants } from "@/components/ui/button";
import { useTrips } from "@/hooks/useTrip";
import { useProfile } from "@/hooks/useProfile";
import { daysUntil } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import type { Trip } from "@/types";

export default function TripsPage() {
  const { trips, loading, refetch, deleteTrip } = useTrips();
  const { profile } = useProfile();

  /**
   * Sort trips by relevance:
   *   1. En cours  (current trips, most-recently-started first)
   *   2. Planifié  (upcoming, closest first)
   *   3. Passé     (most recently finished first)
   */
  const sortedTrips = useMemo(() => {
    const bucket = (t: Trip): 0 | 1 | 2 => {
      const startDays = daysUntil(t.startDate);
      const endDays = daysUntil(t.endDate);
      if (endDays < 0) return 2; // past
      if (startDays > 0) return 1; // upcoming
      return 0; // current
    };
    return [...trips].sort((a, b) => {
      const ba = bucket(a);
      const bb = bucket(b);
      if (ba !== bb) return ba - bb;
      // Within bucket
      const sa = new Date(a.startDate).getTime();
      const sb = new Date(b.startDate).getTime();
      if (ba === 1) return sa - sb; // upcoming: closest first (asc)
      return sb - sa; // current/past: most recent first (desc)
    });
  }, [trips]);

  /** The single most relevant trip for the "Aujourd'hui" block — already first in sortedTrips. */
  const featuredTrip = sortedTrips[0] ?? null;

  const [refreshing, setRefreshing] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const firstName = profile?.name?.split(" ")[0] ?? null;

  const handleDelete = async (id: string) => {
    setConfirmDelete(id);
  };

  const performDelete = async () => {
    if (!confirmDelete) return;
    await deleteTrip(confirmDelete);
    setConfirmDelete(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 400);
  };

  return (
    <>
      <MeshGradientBackground />

      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 glass-strong border-b border-white/8">
          <div
            className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
          >
            <div>
              <h1 className="text-xl font-bold gradient-text leading-none">
                Time to Go
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {firstName ? `Salut ${firstName} 👋` : "Tes voyages"}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/8 active:bg-white/12 transition-all"
                title="Actualiser"
              >
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              </button>
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Content */}
        <main
          className="max-w-3xl mx-auto px-4 py-5"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500/50 border-t-indigo-400 animate-spin" />
            </div>
          ) : trips.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <EmptyState
                icon={Plane}
                title="Aucun voyage pour l'instant"
                description="Crée ton premier voyage pour commencer à planifier et gérer le budget."
                action={
                  <Link
                    href="/trips/new"
                    className={cn(
                      buttonVariants(),
                      "gradient-primary text-white border-0 gap-1.5 h-11 px-5"
                    )}
                  >
                    <Plus size={16} />
                    Créer un voyage
                  </Link>
                }
              />
            </motion.div>
          ) : (
            <>
              {/* "Aujourd'hui" planning block (most relevant trip) */}
              {featuredTrip && (
                <div className="mb-6">
                  <TodayPlanningBlock trip={featuredTrip} />
                </div>
              )}

              {/* Section header */}
              <div className="flex items-baseline justify-between mb-4 px-1">
                <h2 className="text-base font-semibold text-slate-200 uppercase tracking-wider">
                  Mes voyages
                </h2>
                <span className="text-sm text-slate-500">
                  {trips.length} au total
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sortedTrips.map((trip, i) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onEdit={(t) => setEditingTripId(t.id)}
                    onDelete={handleDelete}
                    index={i}
                  />
                ))}
              </div>
            </>
          )}
        </main>

        {/* Floating Action Button */}
        {!loading && trips.length > 0 && (
          <Link
            href="/trips/new"
            className="fixed right-4 z-40 w-14 h-14 rounded-full gradient-primary text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center active:scale-95 hover:scale-105 transition-all"
            style={{
              bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)",
            }}
            aria-label="Nouveau voyage"
            title="Nouveau voyage"
          >
            <Plus size={24} strokeWidth={2.5} />
          </Link>
        )}

        {/* Edit dialog */}
        {editingTripId && (
          <TripEditWrapper
            tripId={editingTripId}
            onClose={async () => {
              setEditingTripId(null);
              await refetch();
            }}
          />
        )}

        {/* Confirm delete dialog */}
        {confirmDelete && (
          <ConfirmDelete
            tripName={trips.find((t) => t.id === confirmDelete)?.name ?? ""}
            onCancel={() => setConfirmDelete(null)}
            onConfirm={performDelete}
          />
        )}
      </div>
    </>
  );
}

function ConfirmDelete({
  tripName,
  onCancel,
  onConfirm,
}: {
  tripName: string;
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
            Supprimer le voyage&nbsp;?
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            <span className="text-slate-200">{tripName}</span> et toutes ses
            données (dépenses, planning, menus) seront définitivement
            supprimés.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-lg bg-white/5 hover:bg-white/8 text-slate-300 text-sm font-medium transition-colors"
            disabled={deleting}
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
