"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Wallet,
  Map,
  Share2,
  UserCircle2,
  ChevronDown,
  RefreshCw,
  Pencil,
  Clock,
} from "lucide-react";
import { GlassCard } from "@/components/layout/GlassCard";
import { Button } from "@/components/ui/button";
import { getBudgetColor, getBudgetTextColor } from "@/lib/budget/budget-color";
import { ShareModal } from "@/components/trips/ShareModal";
import { IdentityPicker } from "@/components/trips/IdentityPicker";
import { BudgetEditDialog } from "@/components/trips/BudgetEditDialog";
import { TripEditDialog } from "@/components/trips/TripEditDialog";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
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
    refetch: refetchTrip,
    updateTrip,
    setMyParticipant,
    addParticipant,
    updateParticipant,
    deleteParticipant,
  } = useTrip(tripId);
  const { expenses, totalSpent, refetch: refetchBudget } = useBudget(tripId);
  const { items: itineraryItems, refetch: refetchItinerary } =
    useItinerary(tripId);

  const [shareOpen, setShareOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchTrip(), refetchBudget(), refetchItinerary()]);
    setTimeout(() => setRefreshing(false), 400);
  };

  if (!trip) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/50 border-t-indigo-400 animate-spin" />
      </div>
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

  const tripDuration = Math.round(
    (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-5">
      {/* Header — back / actions */}
      <div className="flex items-center justify-between -mt-1">
        <Link
          href="/trips"
          className="p-2 -ml-2 rounded-xl hover:bg-white/8 active:bg-white/12 text-slate-400 transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl hover:bg-white/8 active:bg-white/12 text-slate-400 transition-all"
            title="Actualiser"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setEditOpen(true)}
            className="p-2 rounded-xl hover:bg-white/8 active:bg-white/12 text-slate-400 transition-all"
            title="Modifier le voyage"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="p-2 rounded-xl hover:bg-white/8 active:bg-white/12 text-indigo-300 transition-all"
            title="Partager"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Trip title */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1.5"
      >
        <div className="flex items-center gap-3">
          <span className="text-5xl">{trip.emoji}</span>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-slate-100 leading-tight truncate">
              {trip.name}
            </h1>
            <p className="text-base text-slate-400 truncate">{trip.destination}</p>
          </div>
        </div>
        <p className="text-sm text-slate-500 pt-1">
          {tripDuration} jour{tripDuration !== 1 ? "s" : ""} · {trip.participants.length} voyageur
          {trip.participants.length !== 1 ? "s" : ""}
        </p>
      </motion.div>

      {/* Identity banner */}
      <motion.button
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setIdentityOpen(true)}
        className="w-full flex items-center gap-3 p-3.5 glass-subtle rounded-2xl border border-white/8 hover:border-white/15 active:scale-[0.99] transition-all text-left group"
      >
        {currentParticipant ? (
          <>
            <ParticipantAvatar participant={currentParticipant} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Connecté en tant que
              </p>
              <p className="text-base font-medium text-slate-200 truncate">
                {currentParticipant.name}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center shrink-0">
              <UserCircle2 size={20} className="text-slate-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Identité
              </p>
              <p className="text-base font-medium text-indigo-400">
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

      {/* Quick stats — large, vertical cards */}
      <div className="grid grid-cols-2 gap-3">
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
            <GlassCard className="h-full hover:border-white/15 transition-colors" padding={false}>
              <div className="p-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                    <Wallet size={19} className="text-indigo-400" />
                  </div>
                  <span className="text-sm text-slate-300 font-medium">Budget</span>
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
                        "text-xs mt-1.5",
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
                    <p className="text-xs text-indigo-400 mt-1.5 font-medium">
                      Définir un budget →
                    </p>
                  )}
                </div>
                {trip.totalBudget && (
                  <div
                    className="h-1.5 bg-white/8 rounded-full overflow-hidden"
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
                <p className="text-xs text-slate-500">
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

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link
            href={`/trips/${tripId}/planning`}
            className="block h-full active:scale-[0.98] transition-transform"
          >
            <GlassCard className="h-full hover:border-white/15 transition-colors" padding={false}>
              <div className="p-4 flex flex-col gap-2.5 h-full">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
                      <Map size={19} className="text-sky-400" />
                    </div>
                    <span className="text-sm text-slate-300 font-medium truncate">
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
                          : "bg-white/5 text-slate-400"
                      )}
                    >
                      {relativeDayLabel(relevantDay.daysOffset)}
                    </span>
                  )}
                </div>
                {relevantDay ? (
                  <div className="flex-1 space-y-1">
                    {relevantDay.items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-1.5 text-sm"
                      >
                        <span className="shrink-0">
                          {ITINERARY_EMOJI[item.type]}
                        </span>
                        {item.time && (
                          <span className="text-xs text-slate-500 tabular-nums shrink-0 flex items-center gap-0.5">
                            <Clock size={10} />
                            {item.time}
                          </span>
                        )}
                        <span className="text-slate-200 truncate">
                          {item.title}
                        </span>
                      </div>
                    ))}
                    {relevantDay.items.length > 3 && (
                      <p className="text-xs text-slate-500">
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
      </div>

      {/* Participants */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-semibold text-slate-200">Voyageurs</h2>
            <span className="text-xs text-slate-500 ml-auto">
              Code <span className="font-mono text-slate-300">{trip.shareCode}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {trip.participants.map((p) => {
              const isMe = p.id === trip.myParticipantId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
                    isMe ? "glass-subtle ring-1 ring-indigo-500/30" : "glass-subtle"
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-sm font-medium text-slate-200">{p.name}</span>
                  {isMe && <span className="text-xs text-indigo-400 font-semibold">moi</span>}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>

      {/* Trip Edit */}
      <TripEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        trip={trip}
        onSaveTrip={async (data) => {
          await updateTrip(data);
        }}
        onAddParticipant={addParticipant}
        onUpdateParticipant={updateParticipant}
        onDeleteParticipant={deleteParticipant}
      />

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

      {/* Share Modal */}
      <ShareModal open={shareOpen} onOpenChange={setShareOpen} trip={trip} />

      {/* Identity Dialog */}
      <Dialog open={identityOpen} onOpenChange={setIdentityOpen}>
        <DialogContent className="glass-strong border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Mon identité</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Indique qui tu es parmi les participants pour que tes dépenses soient
            bien attribuées.
          </p>
          <IdentityPicker
            participants={trip.participants}
            selectedId={trip.myParticipantId}
            onSelect={async (id) => {
              await setMyParticipant(id);
              setIdentityOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
