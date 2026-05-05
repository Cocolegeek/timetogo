"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Wallet,
  Map,
  CheckSquare,
  TrendingUp,
  Share2,
  UserCircle2,
  ChevronDown,
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
  const { trip, setMyParticipant } = useTrip(tripId);
  const { expenses, totalSpent } = useBudget(tripId);
  const { checkedCount, totalCount } = useChecklist(tripId);

  const [shareOpen, setShareOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);

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
      {/* Trip header */}
      <div className="flex items-start gap-3">
        <Link
          href="/trips"
          className="p-2 rounded-xl hover:bg-white/8 text-slate-400 hover:text-slate-200 transition-all mt-0.5 shrink-0"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-3xl">{trip.emoji}</span>
            <h1 className="text-xl font-bold text-slate-100 truncate">
              {trip.name}
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            {trip.destination} · {tripDuration} jour{tripDuration !== 1 ? "s" : ""} ·{" "}
            {trip.participants.length} voyageur
            {trip.participants.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShareOpen(true)}
          className="text-slate-400 hover:text-indigo-300 shrink-0 mt-0.5"
          title="Partager le voyage"
        >
          <Share2 size={18} />
        </Button>
      </div>

      {/* Identity banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <button
          onClick={() => setIdentityOpen(true)}
          className="w-full flex items-center gap-3 p-3.5 glass-subtle rounded-xl border border-white/8 hover:border-white/15 transition-all text-left group"
        >
          {currentParticipant ? (
            <>
              <ParticipantAvatar participant={currentParticipant} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">Connecté en tant que</p>
                <p className="text-sm font-medium text-slate-200">
                  {currentParticipant.name}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center shrink-0">
                <UserCircle2 size={16} className="text-slate-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Qui es-tu dans ce voyage ?</p>
                <p className="text-sm font-medium text-indigo-400">
                  Sélectionner mon identité
                </p>
              </div>
            </>
          )}
          <ChevronDown
            size={15}
            className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0"
          />
        </button>
      </motion.div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
        >
          <GlassCard className="h-full" padding={false}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                  <Wallet size={15} className="text-indigo-400" />
                </div>
                <span className="text-xs text-slate-400">Budget</span>
              </div>
              <p className="text-xl font-bold text-slate-100">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: trip.currency,
                  maximumFractionDigits: 0,
                }).format(totalSpent)}
              </p>
              {trip.totalBudget && (
                <>
                  <p className="text-xs text-slate-500 mb-2">
                    /{" "}
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: trip.currency,
                      maximumFractionDigits: 0,
                    }).format(trip.totalBudget)}
                  </p>
                  <Progress
                    value={budgetProgress}
                    className="h-1 bg-white/8 [&>div]:bg-indigo-500"
                  />
                </>
              )}
              <p className="text-xs text-slate-500 mt-1.5">
                {expenses.length} dépense{expenses.length !== 1 ? "s" : ""}
              </p>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="h-full" padding={false}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <CheckSquare size={15} className="text-emerald-400" />
                </div>
                <span className="text-xs text-slate-400">Checklist</span>
              </div>
              <p className="text-xl font-bold text-slate-100">
                {checkedCount}/{totalCount}
              </p>
              <p className="text-xs text-slate-500 mb-2">items cochés</p>
              {totalCount > 0 && (
                <Progress
                  value={checklistProgress}
                  className="h-1 bg-white/8 [&>div]:bg-emerald-500"
                />
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Module shortcuts */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Budget",
            href: "budget",
            Icon: Wallet,
            color: "text-indigo-400",
            bg: "bg-indigo-500/10",
          },
          {
            label: "Planning",
            href: "planning",
            Icon: Map,
            color: "text-sky-400",
            bg: "bg-sky-500/10",
          },
          {
            label: "Checklist",
            href: "checklist",
            Icon: CheckSquare,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
          },
        ].map(({ label, href, Icon, color, bg }, i) => (
          <motion.div
            key={href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
          >
            <Link
              href={`/trips/${tripId}/${href}`}
              className="glass-subtle rounded-xl p-4 flex flex-col items-center gap-2 hover:border-white/15 transition-all group block"
            >
              <div
                className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}
              >
                <Icon size={18} className={color} />
              </div>
              <span className="text-xs font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
                {label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Participants */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-200">Voyageurs</h2>
          <span className="text-xs text-slate-600 ml-auto">
            Code : <span className="font-mono text-slate-400">{trip.shareCode}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {trip.participants.map((p) => {
            const isMe = p.id === trip.myParticipantId;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                  isMe
                    ? "glass-subtle ring-1 ring-indigo-500/30"
                    : "glass-subtle"
                }`}
              >
                <div
                  className="w-5 h-5 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-sm text-slate-300">{p.name}</span>
                {isMe && (
                  <span className="text-xs text-indigo-400">moi</span>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Share Modal */}
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        trip={trip}
      />

      {/* Identity Dialog */}
      <Dialog open={identityOpen} onOpenChange={setIdentityOpen}>
        <DialogContent className="glass-strong border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Mon identité</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Indique qui tu es parmi les participants pour que tes dépenses soient bien attribuées.
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
