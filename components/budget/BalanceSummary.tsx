"use client";

import { motion } from "framer-motion";
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
            <div className="glass-subtle rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: participant.color }}
                />
                <p className="font-semibold text-slate-100 text-lg truncate">
                  {firstName(participant.name)}
                </p>
              </div>
              <span
                className={cn(
                  "font-bold text-lg tabular-nums shrink-0",
                  toneClass
                )}
              >
                {sign}
                {formatCurrency(Math.abs(balance.net), currency)}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
