"use client";

import Link from "next/link";
import { Plus, Plane, RefreshCw } from "lucide-react";
import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { TripCard } from "@/components/trips/TripCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserMenu } from "@/components/layout/UserMenu";
import { buttonVariants } from "@/components/ui/button";
import { useTrips } from "@/hooks/useTrip";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function TripsPage() {
  const { trips, loading, refetch, deleteTrip } = useTrips();
  const [refreshing, setRefreshing] = useState(false);

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer ce voyage et toutes ses données ?")) {
      await deleteTrip(id);
    }
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
        {/* Header — simplifié */}
        <header className="sticky top-0 z-30 glass-strong border-b border-white/8">
          <div
            className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
          >
            <div>
              <h1 className="text-lg font-bold gradient-text leading-none">
                Time to Go
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {loading
                  ? "…"
                  : `${trips.length} voyage${trips.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/8 active:bg-white/12 transition-all"
                title="Actualiser"
              >
                <RefreshCw
                  size={18}
                  className={refreshing ? "animate-spin" : ""}
                />
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
            <EmptyState
              icon={Plane}
              title="Aucun voyage pour l'instant"
              description="Crée ton premier voyage pour commencer à planifier et gérer le budget."
              action={
                <Link
                  href="/trips/new"
                  className={cn(
                    buttonVariants(),
                    "gradient-primary text-white border-0 gap-1.5"
                  )}
                >
                  <Plus size={16} />
                  Créer un voyage
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {trips.map((trip, i) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onDelete={handleDelete}
                  index={i}
                />
              ))}
            </div>
          )}
        </main>

        {/* Floating Action Button — Nouveau voyage */}
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
      </div>
    </>
  );
}
