"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { Settlement, Participant } from "@/types";

interface DebtSettlementsProps {
  settlements: Settlement[];
  participants: Participant[];
  currency: string;
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function DebtSettlements({
  settlements,
  participants,
  currency,
}: DebtSettlementsProps) {
  if (settlements.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-emerald-400">
        <CheckCircle2 size={18} />
        <span>Tout le monde est quitte !</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {settlements.map((s, i) => {
        const from = participants.find((p) => p.id === s.fromId);
        const to = participants.find((p) => p.id === s.toId);
        if (!from || !to) return null;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-subtle rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: from.color }}
              />
              <span className="text-sm text-slate-100 font-semibold truncate">
                {from.name}
              </span>
              <ArrowRight size={14} className="text-slate-500 shrink-0" />
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: to.color }}
              />
              <span className="text-sm text-slate-100 font-semibold truncate">
                {to.name}
              </span>
            </div>
            <span className="font-bold text-base text-indigo-300 shrink-0 tabular-nums">
              {formatAmount(s.amount, currency)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
