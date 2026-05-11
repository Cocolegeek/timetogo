"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Plane, RefreshCw } from "lucide-react";
import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { TripCard } from "@/components/trips/TripCard";
import { TripEditWrapper } from "@/components/trips/TripEditWrapper";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { Spinner } from "@/components/shared/Spinner";
import { UserMenu } from "@/components/layout/UserMenu";
import { buttonVariants } from "@/components/ui/button";
import { useTrips } from "@/hooks/useTrip";
import { useProfile } from "@/hooks/useProfile";
import { PwaInstallBanner } from "@/components/shared/PwaInstallBanner";
import { daysUntil } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import type { Trip } from "@/types";

export default function TripsPage() {
  const { trips, loading, refetch, deleteTrip } = useTrips();
  const { profile } = useProfile();

  /**
   * Sort entries:
   *   - Voyages first, bucketed by status (en cours / planifié / passé)
   *   - Budgets (groups) after, most recently created first
   */
  const sortedTrips = useMemo(() => {
    const bucket = (t: Trip): 0 | 1 | 2 | 3 => {
      if (t.type === "group") return 3;
      const startDays = daysUntil(t.startDate);
      const endDays = daysUntil(t.endDate);
      if (endDays < 0) return 2;
      if (startDays > 0) return 1;
      return 0;
    };
    return [...trips].sort((a, b) => {
      const ba = bucket(a);
      const bb = bucket(b);
      if (ba !== bb) return ba - bb;
      if (a.type === "trip" && b.type === "trip") {
        const sa = new Date(a.startDate).getTime();
        const sb = new Date(b.startDate).getTime();
        if (ba === 1) return sa - sb;
        return sb - sa;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [trips]);


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
        <header className="sticky top-0 z-30 glass-strong border-b border-foreground/8">
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
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-foreground/8 active:bg-foreground/12 transition-all"
                title="Actualiser"
              >
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              </button>
              <UserMenu />
            </div>
          </div>
        </header>

        <PwaInstallBanner />

        {/* Content */}
        <main
          className="max-w-3xl mx-auto px-4 py-5"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
        >
          {loading ? (
            <Spinner />
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
              {/* Section header */}
              <div className="flex items-baseline justify-between mb-4 px-1">
                <h2 className="text-base font-semibold text-slate-200 uppercase tracking-wider">
                  Voyages & budgets
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
            className="fixed right-4 z-40 w-14 h-14 rounded-full gradient-primary text-white shadow-section-strong flex items-center justify-center active:scale-95 hover:scale-105 transition-all"
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
          <ConfirmDeleteDialog
            title="Supprimer le voyage ?"
            description={
              <>
                <span className="text-slate-200">
                  {trips.find((t) => t.id === confirmDelete)?.name ?? ""}
                </span>{" "}
                et toutes ses données (dépenses, planning, menus) seront définitivement supprimés.
              </>
            }
            onCancel={() => setConfirmDelete(null)}
            onConfirm={performDelete}
          />
        )}
      </div>
    </>
  );
}

