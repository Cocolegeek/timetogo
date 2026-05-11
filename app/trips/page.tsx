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
import { Spinner } from "@/components/shared/Spinner";
import { UserMenu } from "@/components/layout/UserMenu";
import { useTrips } from "@/hooks/useTrip";
import { useProfile } from "@/hooks/useProfile";
import { PwaInstallBanner } from "@/components/shared/PwaInstallBanner";
import { daysUntil } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { isVoyage } from "@/lib/trip-features";
import type { Trip, VoyageTrip } from "@/types";

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

  const sortedGroups = useMemo(
    () =>
      trips
        .filter((t) => t.type === "group")
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [trips]
  );

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
        {/* ─── Sticky header — minimal brand bar ─────────────────────── */}
        <header
          className="sticky top-0 z-30 glass-strong border-b border-foreground/8"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold gradient-text leading-none">
              Time to Go
            </h1>
            <UserMenu />
          </div>
        </header>

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
                avatarUrl={profile?.custom_avatar_url ?? profile?.avatar_url ?? null}
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
                          text="Aucun voyage pour l'instant"
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
                              index={i}
                            />
                          ))}
                        </div>
                      )
                    ) : sortedGroups.length === 0 ? (
                      <SectionEmpty
                        icon={Wallet}
                        text="Aucun budget partagé"
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
            className="fixed right-4 z-40 w-14 h-14 rounded-full gradient-primary text-white shadow-section-strong flex items-center justify-center active:scale-95 hover:scale-105 transition-all"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
            aria-label="Nouveau"
            title="Nouveau"
          >
            <Plus size={24} strokeWidth={2.5} />
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
  avatarUrl,
  voyageCount,
  groupCount,
  ongoingCount,
  isEmpty,
}: {
  firstName: string | null;
  avatarUrl: string | null;
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
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-3xl p-5 sm:p-6 shadow-section-strong"
      style={{
        background:
          "linear-gradient(135deg, var(--accent-500), oklch(0.50 calc(var(--accent-c) + 0.04) calc(var(--accent-h) + 25)))",
      }}
    >
      {/* Glossy top highlight */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at top, oklch(1 0 0 / 22%), transparent 70%)",
        }}
      />
      {/* Decorative orb */}
      <div
        className="absolute -top-16 -right-12 w-48 h-48 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(1 0 0 / 24%), transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      <div className="relative flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={firstName ?? "avatar"}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/30 shadow-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {firstName?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-widest font-bold text-white/70 mb-1">
            Bonjour
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight truncate">
            {firstName ?? "Voyageur"} 👋
          </h2>
          <p className="text-sm text-white/80 mt-1.5 leading-snug">{subtitle}</p>
        </div>

        {ongoingCount > 0 && (
          <div className="hidden sm:flex shrink-0 flex-col items-center justify-center px-4 py-3 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
            <Sparkles size={16} className="text-white/90 mb-1" />
            <p className="text-2xl font-bold text-white leading-none tabular-nums">
              {ongoingCount}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/75 font-semibold mt-1">
              en cours
            </p>
          </div>
        )}
      </div>

      {ongoingCount > 0 && (
        <div className="sm:hidden relative mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 border border-white/20">
          <Sparkles size={14} className="text-white/90 shrink-0" />
          <p className="text-sm text-white font-semibold">
            {ongoingCount} voyage{ongoingCount !== 1 ? "s" : ""} en cours
          </p>
        </div>
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
    <div className="relative flex items-center gap-1 p-1 rounded-2xl bg-foreground/5 border border-foreground/8">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]",
              isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="tab-pill"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent-500), oklch(0.50 calc(var(--accent-c) + 0.03) calc(var(--accent-h) + 25)))",
                  boxShadow: "0 6px 18px -6px var(--accent-glow)",
                }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <Icon size={15} strokeWidth={isActive ? 2.4 : 2} />
              <span>{tab.label}</span>
              <span
                className={cn(
                  "text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums leading-none",
                  isActive
                    ? "bg-white/20 text-white"
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
      className="flex items-center gap-3 px-4 py-4 rounded-2xl border border-dashed border-foreground/15 bg-foreground/3 hover:bg-foreground/6 hover:border-foreground/25 transition-all active:scale-[0.99]"
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
      <div className="glass rounded-3xl p-8 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-section-soft flex items-center justify-center">
          <Compass size={32} className="text-section" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-xl font-bold text-slate-100">
            Bienvenue dans Time to Go
          </h3>
          <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            Crée ton premier voyage pour planifier ton itinéraire, partager le
            budget et organiser les repas avec tes voyageurs.
          </p>
        </div>
        <Link
          href="/trips/new"
          className={cn(
            "inline-flex items-center justify-center gap-1.5 px-6 h-11 rounded-xl gradient-primary text-white font-semibold shadow-section-strong active:scale-95 transition-all"
          )}
        >
          <Plus size={16} />
          Commencer
        </Link>
      </div>
    </motion.div>
  );
}
