"use client";

import Link from "next/link";
import { Plus, Plane, RefreshCw } from "lucide-react";
import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { TripCard } from "@/components/trips/TripCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserMenu } from "@/components/layout/UserMenu";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
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
    setRefreshing(false);
  };

  return (
    <>
      <MeshGradientBackground />

      <div className="min-h-screen">
        {/* Header */}
        <header className="glass-strong border-b border-white/8 sticky top-0 z-40">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold gradient-text">Time to Go</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? "…" : `${trips.length} voyage${trips.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-slate-400 hover:text-slate-200"
                title="Actualiser"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              </Button>
              <Link
                href="/trips/new"
                className={cn(buttonVariants(), "gradient-primary text-white border-0 gap-1.5")}
              >
                <Plus size={16} />
                Nouveau voyage
              </Link>
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-3xl mx-auto px-4 py-6">
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
                  className={cn(buttonVariants(), "gradient-primary text-white border-0 gap-1.5")}
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
      </div>
    </>
  );
}
