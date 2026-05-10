"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { GlassCard } from "@/components/layout/GlassCard";
import { cn } from "@/lib/utils";
import type { Balance, Participant } from "@/types";

interface BalanceSummaryProps {
  balances: Balance[];
  participants: Participant[];
  currency: string;
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export function BalanceSummary({
  balances,
  participants,
  currency,
}: BalanceSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {balances.map((balance, i) => {
        const participant = participants.find(
          (p) => p.id === balance.participantId
        );
        if (!participant) return null;

        const isCreditor = balance.net > 0.005;
        const isDebtor = balance.net < -0.005;

        return (
          <motion.div
            key={balance.participantId}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard className="relative overflow-hidden" padding={false}>
              {/* Colored left accent */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                style={{ backgroundColor: participant.color }}
              />

              <div className="p-4 pl-5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-100 text-base truncate">
                    {participant.name}
                  </p>
                  <p className="text-base text-slate-400 mt-1">
                    Payé{" "}
                    <span className="text-slate-200">
                      {formatAmount(balance.paid, currency)}
                    </span>{" "}
                    · Doit{" "}
                    <span className="text-slate-200">
                      {formatAmount(balance.owes, currency)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isCreditor ? (
                    <TrendingUp size={16} className="text-emerald-400" />
                  ) : isDebtor ? (
                    <TrendingDown size={16} className="text-red-400" />
                  ) : (
                    <Minus size={16} className="text-slate-500" />
                  )}
                  <span
                    className={cn(
                      "font-bold text-base tabular-nums",
                      isCreditor && "text-emerald-400",
                      isDebtor && "text-red-400",
                      !isCreditor && !isDebtor && "text-slate-500"
                    )}
                  >
                    {isCreditor ? "+" : isDebtor ? "-" : ""}
                    {formatAmount(balance.net, currency)}
                  </span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}
