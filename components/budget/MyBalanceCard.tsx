"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import type { Balance, Participant } from "@/types";

interface MyBalanceCardProps {
  balance: Balance;
  participant: Participant;
  currency: string;
}

export function MyBalanceCard({ balance, participant, currency }: MyBalanceCardProps) {
  const isCreditor = balance.net > 0.005;
  const isDebtor = balance.net < -0.005;
  const isEven = !isCreditor && !isDebtor;

  const Icon = isCreditor ? TrendingUp : isDebtor ? TrendingDown : CheckCircle2;
  const tone = isCreditor
    ? { label: "On te doit", color: "text-emerald-300", iconColor: "text-emerald-400" }
    : isDebtor
      ? { label: "Tu dois", color: "text-red-300", iconColor: "text-red-400" }
      : { label: "Tu es quitte", color: "text-emerald-300", iconColor: "text-emerald-400" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl shadow-section-strong"
      style={{
        background:
          "linear-gradient(135deg, var(--accent-500), oklch(0.50 calc(var(--accent-c) + 0.04) calc(var(--accent-h) + 25)))",
      }}
    >
      {/* Glossy highlight */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at top, oklch(1 0 0 / 22%), transparent 70%)",
        }}
      />
      {/* Decorative orb */}
      <div
        className="absolute -bottom-16 -right-12 w-44 h-44 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(1 0 0 / 18%), transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      <div className="relative p-5 flex items-center gap-4">
        {/* Participant chip */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <span
            className="w-10 h-10 rounded-full ring-2 ring-white/40 shadow-md"
            style={{ backgroundColor: participant.color }}
            aria-hidden
          />
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/80 leading-none">
            Moi
          </span>
        </div>

        {/* Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon size={14} className={tone.iconColor} />
            <p className="text-xs uppercase tracking-widest font-bold text-white/80">
              {tone.label}
            </p>
          </div>
          {isEven ? (
            <p className="text-xl sm:text-2xl font-bold text-white leading-tight">
              Tout est équilibré ✨
            </p>
          ) : (
            <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums leading-none">
              {formatCurrency(Math.abs(balance.net), currency)}
            </p>
          )}
          <p className="text-xs text-white/75 mt-2 leading-snug">
            Payé{" "}
            <span className="text-white font-semibold">
              {formatCurrency(Math.abs(balance.paid), currency)}
            </span>{" "}
            · Part{" "}
            <span className="text-white font-semibold">
              {formatCurrency(Math.abs(balance.owes), currency)}
            </span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
