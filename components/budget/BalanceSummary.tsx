"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/layout/GlassCard";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-currency";
import type { Balance, Participant } from "@/types";

interface BalanceSummaryProps {
  balances: Balance[];
  participants: Participant[];
  currency: string;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function BalanceSummary({
  balances,
  participants,
  currency,
}: BalanceSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {balances.map((balance, i) => {
        const participant = participants.find(
          (p) => p.id === balance.participantId
        );
        if (!participant) return null;

        const isCreditor = balance.net > 0.005;
        const isDebtor = balance.net < -0.005;

        const sign = isCreditor ? "+" : isDebtor ? "-" : "";
        const toneClass = isCreditor
          ? "text-emerald-400"
          : isDebtor
            ? "text-red-400"
            : "text-slate-500";

        return (
          <motion.div
            key={balance.participantId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <GlassCard className="relative overflow-hidden" padding={false}>
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                style={{ backgroundColor: participant.color }}
              />
              <div className="px-4 py-3 pl-5 flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-100 text-base truncate">
                  {firstName(participant.name)}
                </p>
                <span
                  className={cn(
                    "font-bold text-base tabular-nums shrink-0",
                    toneClass
                  )}
                >
                  {sign}
                  {formatCurrency(Math.abs(balance.net), currency)}
                </span>
              </div>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}
