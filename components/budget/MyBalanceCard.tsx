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
    <div className="relative overflow-hidden glass-subtle rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.55 var(--accent-c) var(--accent-h) / 55%), oklch(0.48 calc(var(--accent-c) + 0.03) calc(var(--accent-h) + 25) / 55%))",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at top, oklch(1 0 0 / 22%), transparent 70%)",
        }}
      />
      <div className="relative flex items-center gap-2.5 min-w-0">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: participant.color }}
        />
        <p className="font-semibold text-slate-100 text-lg truncate">
          {firstName(participant.name)}
        </p>
      </div>
      <span className={cn("relative font-bold text-lg tabular-nums shrink-0", toneClass)}>
        {sign}{formatCurrency(Math.abs(balance.net), currency)}
      </span>
    </div>
  );
}
