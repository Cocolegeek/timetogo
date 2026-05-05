"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Wallet,
  CheckSquare,
  Share2,
  UserCircle2,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { GlassCard } from "@/components/layout/GlassCard";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ShareModal } from "@/components/trips/ShareModal";
import { IdentityPicker } from "@/components/trips/IdentityPicker";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTrip } from "@/hooks/useTrip";
import { useBudget } from "@/hooks/useBudget";
import { useChecklist } from "@/hooks/useChecklist";

interface TripDashboardProps {
  params: Promise<{ tripId: string }>;
}

export default function TripDashboardPage({ params }: TripDashboardProps) {
  const { tripId } = use(params);
  const { trip, refetch: refetchTrip, setMyParticipant } = useTrip(tripId);
  const { expenses, totalSpent, refetch: refetchBudget } = useBudget(tripId);
  const { checkedCount, totalCount, refetch: refetchChecklist } = useChecklist(tripId);

  const [shareOpen, setShareOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchTrip(), refetchBudget(), refetchChecklist()]);
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
  const budgetProgress = trip.totalBudget
    ? Math.min((totalSpent / trip.totalBudget) * 100, 100)
    : 0;
  const checklistProgress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;
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
        className="space-y-1"
      >
        <div className="flex items-center gap-3">
          <span className="text-4xl">{trip.emoji}</span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-100 leading-tight truncate">
              {trip.name}
            </h1>
            <p className="text-sm text-slate-400 truncate">{trip.destination}</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 pt-1">
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
            <ParticipantAvatar participant={currentParticipant} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider">
                Connecté en tant que
              </p>
              <p className="text-sm font-medium text-slate-200 truncate">
                {currentParticipant.name}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center shrink-0">
              <UserCircle2 size={18} className="text-slate-500" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider">
                Identité
              </p>
              <p className="text-sm font-medium text-indigo-400">
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
          <GlassCard className="h-full" padding={false}>
            <div className="p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                  <Wallet size={17} className="text-indigo-400" />
                </div>
                <span className="text-xs text-slate-400 font-medium">Budget</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100 leading-none">
                  {new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: trip.currency,
                    maximumFractionDigits: 0,
                  }).format(totalSpent)}
                </p>
                {trip.totalBudget && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    /{" "}
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: trip.currency,
                      maximumFractionDigits: 0,
                    }).format(trip.totalBudget)}
                  </p>
                )}
              </div>
              {trip.totalBudget && (
                <Progress
                  value={budgetProgress}
                  className="h-1 bg-white/8 [&>div]:bg-indigo-500"
                />
              )}
              <p className="text-[11px] text-slate-500">
                {expenses.length} dépense{expenses.length !== 1 ? "s" : ""}
              </p>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="h-full" padding={false}>
            <div className="p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <CheckSquare size={17} className="text-emerald-400" />
                </div>
                <span className="text-xs text-slate-400 font-medium">Checklist</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100 leading-none">
                  {checkedCount}
                  <span className="text-base text-slate-500 font-medium">
                    /{totalCount}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">items cochés</p>
              </div>
              {totalCount > 0 ? (
                <Progress
                  value={checklistProgress}
                  className="h-1 bg-white/8 [&>div]:bg-emerald-500"
                />
              ) : (
                <div className="h-1" />
              )}
              <p className="text-[11px] text-slate-500">
                {totalCount > 0 ? `${Math.round(checklistProgress)}% prêt` : "Vide"}
              </p>
            </div>
          </GlassCard>
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
            <h2 className="text-sm font-semibold text-slate-200">Voyageurs</h2>
            <span className="text-xs text-slate-600 ml-auto">
              Code <span className="font-mono text-slate-400">{trip.shareCode}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {trip.participants.map((p) => {
              const isMe = p.id === trip.myParticipantId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                    isMe ? "glass-subtle ring-1 ring-indigo-500/30" : "glass-subtle"
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-sm text-slate-300">{p.name}</span>
                  {isMe && <span className="text-[10px] text-indigo-400">moi</span>}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>

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
