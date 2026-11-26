"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { m as motion } from "framer-motion";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { TripCard } from "@/components/trips/TripCard";

const TripEditWrapper = dynamic(
  () => import("@/components/trips/TripEditWrapper").then((m) => ({ default: m.TripEditWrapper })),
  { ssr: false }
);
const ShareModal = dynamic(
  () => import("@/components/trips/ShareModal").then((m) => ({ default: m.ShareModal })),
  { ssr: false }
);
const ConfirmDeleteDialog = dynamic(
  () => import("@/components/shared/ConfirmDeleteDialog").then((m) => ({ default: m.ConfirmDeleteDialog })),
  { ssr: false }
);
import { Spinner } from "@/components/shared/Spinner";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTrips } from "@/hooks/useTrip";
import { useProfile } from "@/hooks/useProfile";
import { useAuthUser } from "@/hooks/useAuthUser";
import { GuestUpgradeCard } from "@/components/auth/GuestUpgradeCard";
import { daysUntil } from "@/lib/format-date";
import type { Trip } from "@/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionLabel } from "@/components/shared/SectionLabel";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { TripCover } from "@/components/trips/TripCover";
import { springSoft } from "@/lib/motion";
import { ClientOnly } from "@/components/shared/ClientOnly";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { useIdlePrefetch } from "@/hooks/useIdlePrefetch";
import { LazyOnboarding } from "@/components/trips/LazyOnboarding";

function TripsPageContent() {
  const { trips, loading, refetch: refetchTrips, deleteTrip } = useTrips();
  // Warm the most likely next screens once the list is shown (not during launch).
  useIdlePrefetch(trips.slice(0, 3).map((t) => `/trips/${t.id}`));
  const { profile } = useProfile();
  const { isAnonymous } = useAuthUser();

  const endOf = (t: Trip) => t.endDate ?? t.startDate ?? "";

  /** Les voyages datés par statut (en cours → à venir → passé), puis par date. */
  const sortedDated = useMemo(() => {
    const dated = trips.filter((t) => !!t.startDate);
    const bucket = (t: Trip): 0 | 1 | 2 => {
      if (daysUntil(endOf(t)) < 0) return 2;
      if (daysUntil(t.startDate as string) > 0) return 1;
      return 0;
    };
    return [...dated].sort((a, b) => {
      const ba = bucket(a);
      const bb = bucket(b);
      if (ba !== bb) return ba - bb;
      const sa = new Date(a.startDate as string).getTime();
      const sb = new Date(b.startDate as string).getTime();
      if (ba === 1) return sa - sb;
      return sb - sa;
    });
  }, [trips]);

  const undated = useMemo(
    () => trips.filter((t) => !t.startDate).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [trips]
  );

  const featured = useMemo(() => sortedDated.find((t) => daysUntil(endOf(t)) >= 0) ?? null, [sortedDated]);
  const upcoming = sortedDated.filter((t) => t !== featured && daysUntil(endOf(t)) >= 0);
  const past = sortedDated.filter((t) => daysUntil(endOf(t)) < 0);

  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [sharingTripId, setSharingTripId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const firstName = profile?.name?.split(" ")[0] ?? null;

  const handleDelete = async (id: string) => setConfirmDelete(id);

  const performDelete = async () => {
    if (!confirmDelete) return;
    await deleteTrip(confirmDelete);
    setConfirmDelete(null);
  };

  const isEmpty = !loading && trips.length === 0;
  const deletingEntry = confirmDelete
    ? trips.find((t) => t.id === confirmDelete)
    : null;

  const cardProps = {
    onEdit: (t: { id: string }) => setEditingTripId(t.id),
    onDelete: handleDelete,
    onShare: (t: { id: string }) => setSharingTripId(t.id),
  };

  return (
    <>
      <div className="min-h-dvh bg-background">
        <AppHeader />

        <main
          className="mx-auto max-w-3xl px-5 pt-2 lg:max-w-5xl lg:px-8"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 7rem)" }}
        >
          {loading ? (
            <Spinner />
          ) : (
            <Stagger step={0.06} className="space-y-8">
              <StaggerItem>
                <PageHeader
                  eyebrow={`Salut ${firstName ?? "toi"}`}
                  title="Tes voyages"
                />
              </StaggerItem>

              {isAnonymous && (
                <StaggerItem>
                  <GuestUpgradeCard compact />
                </StaggerItem>
              )}

              {isEmpty ? (
                <StaggerItem>
                  <FirstTimeEmptyState />
                </StaggerItem>
              ) : (
                <>
                  {featured && (
                    <StaggerItem>
                      <TripCard trip={featured} variant="featured" {...cardProps} />
                    </StaggerItem>
                  )}

                  {upcoming.length > 0 && (
                    <StaggerItem>
                      <TripSection title="À venir" trips={upcoming} cardProps={cardProps} />
                    </StaggerItem>
                  )}

                  {undated.length > 0 && (
                    <StaggerItem>
                      <TripSection title="Sans date" trips={undated} cardProps={cardProps} />
                    </StaggerItem>
                  )}

                  {past.length > 0 && (
                    <StaggerItem>
                      <TripSection title="Souvenirs" trips={past} cardProps={cardProps} />
                    </StaggerItem>
                  )}
                </>
              )}
            </Stagger>
          )}
        </main>

        {!loading && trips.length > 0 && (
          <motion.div
            initial={{ y: 96, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...springSoft, delay: 0.25 }}
            className="fixed inset-x-0 z-40 flex justify-center pointer-events-none"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
          >
            <Link
              href="/trips/new"
              className="pressable pointer-events-auto flex h-14 items-center gap-2 rounded-full bg-foreground px-6 text-[0.95rem] font-semibold text-background shadow-float outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus size={20} strokeWidth={2.4} />
              Nouveau
            </Link>
          </motion.div>
        )}

        {/* Dialogs */}
        {editingTripId && (
          <TripEditWrapper
            tripId={editingTripId}
            onClose={async () => {
              setEditingTripId(null);
              await refetchTrips();
            }}
          />
        )}

        {sharingTripId && (() => {
          const tripToShare = trips.find((t) => t.id === sharingTripId);
          if (!tripToShare) return null;
          return (
            <ShareModal
              open={true}
              onOpenChange={(open) => { if (!open) setSharingTripId(null); }}
              trip={tripToShare}
            />
          );
        })()}

        <LazyOnboarding />

        {confirmDelete && (
          <ConfirmDeleteDialog
            title="Supprimer ?"
            description={
              <>
                <span className="text-foreground">
                  {deletingEntry?.name ?? ""}
                </span>{" "}
                et toutes ses données (dépenses
                {deletingEntry?.modules.includes("planning") && ", planning"}
                {deletingEntry?.modules.includes("menus") && ", menus"}
                {deletingEntry?.modules.includes("lists") && ", listes"}) seront
                définitivement supprimés.
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

// ─── TripSection ────────────────────────────────────────────────────────────

function TripSection({
  title,
  trips,
  cardProps,
}: {
  title: string;
  trips: Trip[];
  cardProps: Pick<React.ComponentProps<typeof TripCard>, "onEdit" | "onDelete" | "onShare">;
}) {
  return (
    <section>
      <SectionLabel>{title}</SectionLabel>
      <div className="-mx-2.5 space-y-1 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:space-y-0">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} {...cardProps} />
        ))}
      </div>
    </section>
  );
}

// ─── First-time empty state (no trips at all) ───────────────────────────────

function FirstTimeEmptyState() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-card shadow-raised">
      <TripCover seed="welcome" className="h-44" />
      <div className="space-y-4 p-6">
        <div className="space-y-1.5">
          <h2 className="font-display text-2xl font-bold tracking-tight">Bienvenue dans la bande</h2>
          <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
            Crée ton premier voyage pour partager le budget, caler le planning et organiser les repas avec tes potes.
          </p>
        </div>
        <Link
          href="/trips/new"
          className="pressable inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-section"
        >
          <Plus size={18} strokeWidth={2.4} />
          Créer un voyage
        </Link>
      </div>
    </div>
  );
}

export default function TripsPage() {
  return (
    <ClientOnly fallback={<div className="mx-auto max-w-3xl px-5 pt-16"><PageSkeleton /></div>}>
      <TripsPageContent />
    </ClientOnly>
  );
}
