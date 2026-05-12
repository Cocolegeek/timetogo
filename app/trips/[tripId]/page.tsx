"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Wallet,
  Map,
  UserCircle2,
  ChevronDown,
  Clock,
} from "lucide-react";
import dynamic from "next/dynamic";
import { GlassCard } from "@/components/layout/GlassCard";
import { getBudgetColor, getBudgetTextColor } from "@/lib/budget/budget-color";
import { IdentityPicker } from "@/components/trips/IdentityPicker";

const BudgetEditDialog = dynamic(
  () => import("@/components/trips/BudgetEditDialog").then((m) => ({ default: m.BudgetEditDialog })),
  { ssr: false }
);
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import { Spinner } from "@/components/shared/Spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTrip } from "@/hooks/useTrip";
import { useBudget } from "@/hooks/useBudget";
import { useItinerary } from "@/hooks/useItinerary";
import { pickRelevantPlanningDay, relativeDayLabel } from "@/lib/planning-day";
import { cn } from "@/lib/utils";
import { isVoyage, tripFeatures } from "@/lib/trip-features";
import type { ItineraryType } from "@/types";

const ITINERARY_EMOJI: Record<ItineraryType, string> = {
  transport: "🚗",
  accommodation: "🏨",
  activity: "🎯",
  food: "🍽️",
  other: "📍",
};

interface TripDashboardProps {
  params: Promise<{ tripId: string }>;
}

export default function TripDashboardPage({ params }: TripDashboardProps) {
  const { tripId } = use(params);
  const {
    trip,
    updateTrip,
    setMyParticipant,
    addParticipant,
  } = useTrip(tripId);
  const { expenses, totalSpent } = useBudget(tripId);
  const { items: itineraryItems } = useItinerary(tripId);

  const [identityOpen, setIdentityOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);

  if (!trip) {
    return (
      <Spinner />
    );
  }

  const currentParticipant = trip.participants.find(
    (p) => p.id === trip.myParticipantId
  );
  const budgetRawPct = trip.totalBudget
    ? (totalSpent / trip.totalBudget) * 100
    : 0;
  const budgetProgress = Math.min(budgetRawPct, 100);
  const budgetBarColor = getBudgetColor(budgetRawPct);
  const budgetIsOver = trip.totalBudget ? totalSpent > trip.totalBudget : false;

  // Most relevant planning day (today if events, else next future, else last past)
  const today = new Date().toISOString().split("T")[0];
  const relevantDay = pickRelevantPlanningDay(itineraryItems, today);

  const features = tripFeatures(trip);
  const tripDuration = isVoyage(trip)
    ? Math.round(
        (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <div className="space-y-5">
      {/* Trip title */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1.5"
      >
        <div className="flex items-center gap-3">
          {trip.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trip.iconUrl}
              alt=""
              className="w-16 h-16 rounded-2xl object-cover shrink-0"
              draggable={false}
            />
          ) : (
            <span className="text-5xl">{trip.emoji}</span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-slate-100 leading-tight truncate">
              {trip.name}
            </h1>
            {isVoyage(trip) && trip.destination && (
              <p className="text-base text-slate-400 truncate">{trip.destination}</p>
            )}
          </div>
        </div>
        <p className="text-base text-slate-500 pt-1">
          {isVoyage(trip)
            ? `${tripDuration} jour${tripDuration !== 1 ? "s" : ""} · ${trip.participants.length} voyageur${trip.participants.length !== 1 ? "s" : ""}`
            : `Budget partagé · ${trip.participants.length} participant${trip.participants.length !== 1 ? "s" : ""}`}
        </p>
      </motion.div>

      {/* Identity banner */}
      <motion.button
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setIdentityOpen(true)}
        className="w-full flex items-center gap-3 p-3.5 glass-subtle rounded-2xl border border-foreground/8 hover:border-foreground/15 active:scale-[0.99] transition-all text-left group"
      >
        {currentParticipant ? (
          <>
            <ParticipantAvatar participant={currentParticipant} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-500 uppercase tracking-wider">
                Connecté en tant que
              </p>
              <p className="text-base font-medium text-slate-200 truncate">
                {currentParticipant.name}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-9 h-9 rounded-full bg-foreground/8 flex items-center justify-center shrink-0">
              <UserCircle2 size={20} className="text-slate-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500 uppercase tracking-wider">
                Identité
              </p>
              <p className="text-base font-medium text-section">
                Sélectionner mon identité
              </p>
            </div>
          </>
        )}
        <ChevronDown
          size={16}
          className="text-slate-600 group-hover:text-slate-400 shrink-0"
        />
      </motion.button>

      {/* Quick stats — stacked cards */}
      <div className="flex flex-col gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <button
            type="button"
            onClick={() => setBudgetOpen(true)}
            className="w-full text-left active:scale-[0.98] transition-transform"
          >
            <GlassCard className="h-full hover:border-foreground/15 transition-colors" padding={false}>
              <div className="p-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-section-soft flex items-center justify-center">
                    <Wallet size={19} className="text-section" />
                  </div>
                  <span className="text-base text-slate-300 font-medium">Budget</span>
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-100 leading-none tabular-nums">
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: trip.currency,
                      maximumFractionDigits: 0,
                    }).format(totalSpent)}
                  </p>
                  {trip.totalBudget ? (
                    <p
                      className={cn(
                        "text-sm mt-1.5",
                        budgetIsOver ? getBudgetTextColor(budgetRawPct) + " font-medium" : "text-slate-500"
                      )}
                    >
                      /{" "}
                      {new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: trip.currency,
                        maximumFractionDigits: 0,
                      }).format(trip.totalBudget)}
                      {budgetIsOver && " · dépassé"}
                    </p>
                  ) : (
                    <p className="text-sm text-section mt-1.5 font-medium">
                      Définir un budget →
                    </p>
                  )}
                </div>
                {trip.totalBudget && (
                  <div
                    className="h-1.5 bg-foreground/8 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(budgetProgress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${budgetProgress}%`,
                        backgroundColor: budgetBarColor,
                        boxShadow: `0 0 8px ${budgetBarColor}55`,
                      }}
                    />
                  </div>
                )}
                <p className="text-sm text-slate-500">
                  {expenses.length} dépense{expenses.length !== 1 ? "s" : ""}
                  {trip.totalBudget && (
                    <>
                      {" · "}
                      <span className={getBudgetTextColor(budgetRawPct) + " font-medium"}>
                        {Math.round(budgetRawPct)}%
                      </span>
                    </>
                  )}
                </p>
              </div>
            </GlassCard>
          </button>
        </motion.div>

        {features.hasPlanning && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link
            href={`/trips/${tripId}/planning`}
            className="block h-full active:scale-[0.98] transition-transform"
          >
            <GlassCard className="h-full hover:border-foreground/15 transition-colors" padding={false}>
              <div className="p-4 flex flex-col gap-2.5 h-full">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
                      <Map size={19} className="text-sky-400" />
                    </div>
                    <span className="text-base text-slate-300 font-medium truncate">
                      Planning
                    </span>
                  </div>
                  {relevantDay && (
                    <span
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider whitespace-nowrap shrink-0",
                        relevantDay.daysOffset === 0
                          ? "bg-emerald-500/15 text-emerald-300"
                          : relevantDay.daysOffset > 0
                          ? "bg-sky-500/15 text-sky-300"
                          : "bg-foreground/5 text-slate-400"
                      )}
                    >
                      {relativeDayLabel(relevantDay.daysOffset)}
                    </span>
                  )}
                </div>
                {relevantDay ? (
                  <div className="flex-1 space-y-2">
                    {relevantDay.items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 text-base"
                      >
                        <span className="shrink-0 text-lg">
                          {ITINERARY_EMOJI[item.type]}
                        </span>
                        {item.time && (
                          <span className="text-sm text-slate-500 tabular-nums shrink-0 flex items-center gap-0.5">
                            <Clock size={12} />
                            {item.time}
                          </span>
                        )}
                        <span className="text-slate-200">
                          {item.title}
                        </span>
                      </div>
                    ))}
                    {relevantDay.items.length > 3 && (
                      <p className="text-sm text-slate-500">
                        + {relevantDay.items.length - 3} autre
                        {relevantDay.items.length - 3 !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center">
                    <p className="text-sm text-slate-400">
                      Aucune étape planifiée →
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>
          </Link>
        </motion.div>
        )}
      </div>

      {/* Budget Edit */}
      <BudgetEditDialog
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        currency={trip.currency}
        initialValue={trip.totalBudget}
        participantCount={trip.participants.length}
        onSave={async (val) => {
          await updateTrip({ totalBudget: val });
        }}
      />

      {/* Identity Dialog */}
      <Dialog open={identityOpen} onOpenChange={setIdentityOpen}>
        <DialogContent className="glass-strong border-foreground/10 max-w-sm flex flex-col max-h-[85vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-slate-100">Mon identité</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 shrink-0">
            Indique qui tu es parmi les participants pour que tes dépenses soient
            bien attribuées.
          </p>
          <div className="overflow-y-auto flex-1 min-h-0 -mx-1 px-1">
            <IdentityPicker
              participants={trip.participants}
              selectedId={trip.myParticipantId}
              onSelect={async (id) => {
                await setMyParticipant(id);
                setIdentityOpen(false);
              }}
              onCreate={async (name) => {
                const FALLBACK_COLORS = [
                  "#6366f1", "#7c3aed", "#0ea5e9", "#10b981",
                  "#f59e0b", "#ef4444", "#ec4899", "#14b8a6",
                ];
                const color =
                  FALLBACK_COLORS[trip.participants.length % FALLBACK_COLORS.length];
                return await addParticipant({ name, color });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
