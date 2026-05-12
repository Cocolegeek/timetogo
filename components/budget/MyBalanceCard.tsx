"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-currency";
import type { Balance, Participant } from "@/types";

interface MyBalanceCardProps {
  balance: Balance;
  participant: Participant;
  currency: string;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function MyBalanceCard({ balance, participant, currency }: MyBalanceCardProps) {
  const isCreditor = balance.net > 0.005;
  const isDebtor = balance.net < -0.005;

  const sign = isCreditor ? "+" : isDebtor ? "-" : "";
  const toneClass = isCreditor ? "text-emerald-400" : "text-red-400";

  return (
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
      <div className="flex flex-col items-end shrink-0">
        <span className={cn("font-bold text-lg tabular-nums", toneClass)}>
          {sign}{formatCurrency(Math.abs(balance.net), currency)}
        </span>
        <span className="text-xs text-slate-500 tabular-nums">
          payé {formatCurrency(balance.paid, currency)} · dû {formatCurrency(balance.owes, currency)}
        </span>
      </div>
    </div>
  );
}
