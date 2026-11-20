"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Compass, Wallet, Sparkles } from "lucide-react";
import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import dynamic from "next/dynamic";
import { TripCard } from "@/components/trips/TripCard";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";

const TripEditWrapper = dynamic(
  () => import("@/components/trips/TripEditWrapper").then((m) => ({ default: m.TripEditWrapper })),
  { ssr: false }
);
const ShareModal = dynamic(
  () => import("@/components/trips/ShareModal").then((m) => ({ default: m.ShareModal })),
  { ssr: false }
);
const OnboardingModal = dynamic(
  () => import("@/components/trips/OnboardingModal").then((m) => ({ default: m.OnboardingModal })),
  { ssr: false }
);
import { Spinner } from "@/components/shared/Spinner";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTrips } from "@/hooks/useTrip";
import { useProfile } from "@/hooks/useProfile";
import { PwaInstallBanner } from "@/components/shared/PwaInstallBanner";
import { daysUntil } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { isVoyage } from "@/lib/trip-features";
import type { VoyageTrip, GroupTrip } from "@/types";

export default function TripsPage() {
  const { trips, loading, refetch: refetchTrips, deleteTrip } = useTrips();
  const { profile } = useProfile();

  /** Sort voyages by status (en cours → planifié → passé), then chronological */
  const sortedVoyages = useMemo(() => {
    const voyages = trips.filter(isVoyage);
    const bucket = (t: VoyageTrip): 0 | 1 | 2 => {
      const startDays = daysUntil(t.startDate);
      const endDays = daysUntil(t.endDate);
      if (endDays < 0) return 2;
      if (startDays > 0) return 1;
      return 0;
    };
    return [...voyages].sort((a, b) => {
      const ba = bucket(a);
      const bb = bucket(b);
      if (ba !== bb) return ba - bb;
      const sa = new Date(a.startDate).getTime();
      const sb = new Date(b.startDate).getTime();
      if (ba === 1) return sa - sb;
      return sb - sa;
    });
  }, [trips]);

  const sortedGroups = useMemo(() => {
    const groups = trips.filter((t): t is GroupTrip => t.type === "group");
    // 0 = permanent (no date), 1 = planifié, 2 = en cours, 3 = passé
    const bucket = (t: GroupTrip): 0 | 1 | 2 | 3 => {
      if (!t.startDate) return 0;
      const startDays = daysUntil(t.startDate);
      const endDays = daysUntil(t.endDate ?? t.startDate);
      if (startDays > 0) return 1;
      if (endDays >= 0) return 2;
      return 3;
    };
    return [...groups].sort((a, b) => {
      const ba = bucket(a);
      const bb = bucket(b);
      if (ba !== bb) return ba - bb;
      if (ba === 0) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      const sa = new Date(a.startDate!).getTime();
      const sb = new Date(b.startDate!).getTime();
      if (ba === 1) return sa - sb;
      return sb - sa;
    });
  }, [trips]);

  const ongoingCount = useMemo(
    () =>
      sortedVoyages.filter((t) => {
        const s = daysUntil(t.startDate);
        const e = daysUntil(t.endDate);
        return s <= 0 && e >= 0;
      }).length,
    [sortedVoyages]
  );

  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [sharingTripId, setSharingTripId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"voyages" | "budgets">("voyages");

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

  return (
    <>
      <MeshGradientBackground />

      <div className="min-h-screen">
        <AppHeader />

        <PwaInstallBanner />

        {/* ─── Main content ──────────────────────────────────────────── */}
        <main
          className="max-w-3xl mx-auto px-4 pt-5 pb-32"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 7rem)" }}
        >
          {loading ? (
            <Spinner />
          ) : (
            <>
              {/* ─── Hero greeting card ─────────────────────────────── */}
              <HeroGreeting
                firstName={firstName}
                voyageCount={sortedVoyages.length}
                groupCount={sortedGroups.length}
                ongoingCount={ongoingCount}
                isEmpty={isEmpty}
              />

              {isEmpty ? (
                <FirstTimeEmptyState />
              ) : (
                <div className="mt-7">
                  <TabSwitcher
                    active={activeTab}
                    onChange={setActiveTab}
                    voyageCount={sortedVoyages.length}
                    groupCount={sortedGroups.length}
                  />

                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4"
                  >
                    {activeTab === "voyages" ? (
                      sortedVoyages.length === 0 ? (
                        <SectionEmpty
                          icon={Compass}
                          text="Pas encore de voyage à l'horizon"
                          ctaLabel="Créer un voyage"
                          href="/trips/new"
                        />
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {sortedVoyages.map((trip, i) => (
                            <TripCard
                              key={trip.id}
                              trip={trip}
                              onEdit={(t) => setEditingTripId(t.id)}
                              onDelete={handleDelete}
                              onShare={(t) => setSharingTripId(t.id)}
                              index={i}
                            />
                          ))}
                        </div>
                      )
                    ) : sortedGroups.length === 0 ? (
                      <SectionEmpty
                        icon={Wallet}
                        text="Pas encore de cagnotte partagée"
                        ctaLabel="Créer un budget"
                        href="/trips/new"
                      />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sortedGroups.map((trip, i) => (
                          <TripCard
                            key={trip.id}
                            trip={trip}
                            onEdit={(t) => setEditingTripId(t.id)}
                            onDelete={handleDelete}
                            onShare={(t) => setSharingTripId(t.id)}
                            index={i}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </>
          )}
        </main>

        {/* ─── FAB ───────────────────────────────────────────────────── */}
        {!loading && trips.length > 0 && (
          <Link
            href="/trips/new"
            className="fixed left-1/2 -translate-x-1/2 z-40 h-14 px-6 rounded-full bg-primary text-primary-foreground shadow-section-strong flex items-center gap-2 font-semibold active:scale-95 transition-all"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
          >
            <Plus size={20} strokeWidth={2.4} />
            Nouveau
          </Link>
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

        <OnboardingModal />

        {confirmDelete && (
          <ConfirmDeleteDialog
            title={
              deletingEntry?.type === "group"
                ? "Supprimer le budget ?"
                : "Supprimer le voyage ?"
            }
            description={
              <>
                <span className="text-slate-200">
                  {deletingEntry?.name ?? ""}
                </span>{" "}
                et toutes ses données (dépenses
                {deletingEntry?.type === "trip" && ", planning, menus"}) seront
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

// ─── HeroGreeting ───────────────────────────────────────────────────────────

function HeroGreeting({
  firstName,
  voyageCount,
  groupCount,
  ongoingCount,
  isEmpty,
}: {
  firstName: string | null;
  voyageCount: number;
  groupCount: number;
  ongoingCount: number;
  isEmpty: boolean;
}) {
  const total = voyageCount + groupCount;
  const subtitle = isEmpty
    ? "Prêt à planifier ton premier voyage ?"
    : total === 1
      ? "1 entrée dans ta collection"
      : `${total} entrées · ${voyageCount} voyage${voyageCount !== 1 ? "s" : ""} · ${groupCount} budget${groupCount !== 1 ? "s" : ""}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <p className="text-sm text-slate-400">Salut {firstName ?? "voyageur"}</p>
      <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-100 mt-0.5">
        Tes voyages
      </h1>
      <p className="text-sm text-slate-400 mt-2">{subtitle}</p>
      {ongoingCount > 0 && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold text-emerald-300">
          <Sparkles size={14} />
          {ongoingCount} voyage{ongoingCount !== 1 ? "s" : ""} en cours
        </p>
      )}
    </motion.div>
  );
}

// ─── TabSwitcher ────────────────────────────────────────────────────────────

function TabSwitcher({
  active,
  onChange,
  voyageCount,
  groupCount,
}: {
  active: "voyages" | "budgets";
  onChange: (tab: "voyages" | "budgets") => void;
  voyageCount: number;
  groupCount: number;
}) {
  const tabs = [
    { id: "voyages" as const, label: "Voyages", icon: Compass, count: voyageCount },
    { id: "budgets" as const, label: "Budgets", icon: Wallet, count: groupCount },
  ];

  return (
    <div className="relative flex items-center gap-1 p-1 rounded-full bg-secondary">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-2 px-3 h-11 rounded-full text-sm font-semibold transition-colors active:scale-[0.98]",
              isActive ? "text-slate-100" : "text-slate-400 hover:text-slate-200"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="tab-pill"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-full bg-card shadow-sm"
              />
            )}
            <span className="relative flex items-center gap-2">
              <Icon size={15} strokeWidth={isActive ? 2.4 : 2} />
              <span>{tab.label}</span>
              <span
                className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full tabular-nums leading-none",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-foreground/10 text-slate-400"
                )}
              >
                {tab.count}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── SectionEmpty ───────────────────────────────────────────────────────────

function SectionEmpty({
  icon: Icon,
  text,
  ctaLabel,
  href,
}: {
  icon: typeof Compass;
  text: string;
  ctaLabel: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-4 rounded-[1.375rem] border border-dashed border-foreground/25 bg-transparent hover:bg-foreground/6 hover:border-foreground/25 transition-all active:scale-[0.99]"
    >
      <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-300 font-medium">{text}</p>
        <p className="text-xs text-section font-semibold mt-0.5">
          {ctaLabel} →
        </p>
      </div>
    </Link>
  );
}

// ─── First-time empty state (no trips at all) ───────────────────────────────

function FirstTimeEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mt-8"
    >
      <div className="glass rounded-[1.75rem] p-8 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-section-soft flex items-center justify-center">
          <Compass size={32} className="text-section" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-xl font-bold text-slate-100">
            Bienvenue dans la bande !
          </h3>
          <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            Crée ton premier voyage pour planifier ton itinéraire, partager le
            budget et organiser les repas avec tes voyageurs.
          </p>
        </div>
        <Link
          href="/trips/new"
          className={cn(
            "inline-flex items-center justify-center gap-1.5 px-6 h-11 rounded-full bg-primary text-primary-foreground font-semibold shadow-section-strong active:scale-95 transition-all"
          )}
        >
          <Plus size={16} />
          Commencer
        </Link>
      </div>
    </motion.div>
  );
}
