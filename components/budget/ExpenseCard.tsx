"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Trash2 } from "lucide-react";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import { CATEGORIES } from "@/lib/budget/categories";
import { cn } from "@/lib/utils";
import type { Expense, Participant } from "@/types";

interface ExpenseCardProps {
  expense: Expense;
  participants: Participant[];
  currency: string;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

const SWIPE_THRESHOLD = -110;

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function ExpenseCard({
  expense,
  participants,
  currency,
  onDelete,
  onEdit,
}: ExpenseCardProps) {
  const payer = participants.find((p) => p.id === expense.paidById);
  const cfg = CATEGORIES[expense.category] ?? CATEGORIES.other;
  const Icon = cfg.icon;

  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  // Background opacity grows as user swipes left
  const bgOpacity = useTransform(x, [SWIPE_THRESHOLD, -10, 0], [1, 0.2, 0]);
  const trashScale = useTransform(x, [SWIPE_THRESHOLD - 20, -40, 0], [1.2, 0.9, 0.6]);

  const handleDragEnd = () => {
    setIsDragging(false);
    if (x.get() <= SWIPE_THRESHOLD) {
      // Confirm delete
      animate(x, -window.innerWidth, {
        duration: 0.25,
        onComplete: () => onDelete(expense.id),
      });
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-xl overflow-hidden"
    >
      {/* Red gradient background revealed by swipe */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-6 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(239,68,68,0.0) 0%, rgba(239,68,68,0.45) 60%, rgba(220,38,38,0.85) 100%)",
          opacity: bgOpacity,
        }}
      >
        <motion.div
          className="flex items-center gap-2 text-white"
          style={{ scale: trashScale }}
        >
          <Trash2 size={18} />
          <span className="text-sm font-semibold">Supprimer</span>
        </motion.div>
      </motion.div>

      {/* Foreground draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        dragDirectionLock
        style={{ x }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (!isDragging) onEdit(expense);
        }}
        className={cn(
          "glass-subtle rounded-xl p-3.5 cursor-pointer touch-pan-y select-none",
          "active:bg-white/8 transition-colors"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Category icon */}
          <div
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
              cfg.bg
            )}
          >
            <Icon size={20} className={cfg.color} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-slate-100 text-[15px] truncate leading-tight">
                {expense.title}
              </p>
              <span className="font-bold text-slate-100 text-[15px] shrink-0 tabular-nums">
                {formatAmount(expense.amountInTripCurrency, currency)}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              {payer && (
                <div className="flex items-center gap-1.5">
                  <ParticipantAvatar participant={payer} size="xs" />
                  <span className="text-xs text-slate-400 truncate">
                    {payer.name}
                  </span>
                </div>
              )}
              <span className="text-xs text-slate-600">·</span>
              <span className="text-xs text-slate-500 shrink-0">
                {new Date(expense.date).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
