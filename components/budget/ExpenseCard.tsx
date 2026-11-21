"use client";

import { useRef } from "react";
import { m as motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Trash2 } from "lucide-react";
import { CATEGORIES } from "@/lib/budget/categories";
import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import type { Expense, Participant } from "@/types";

interface ExpenseCardProps {
  expense: Expense;
  participants: Participant[];
  currency: string;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
  /** Hide the top divider (first row of a group). */
  first?: boolean;
}

const SWIPE_THRESHOLD = -110;

/** One expense row inside a grouped list. Swipe left to delete, tap to open. */
export function ExpenseCard({ expense, participants, currency, onDelete, onEdit, first }: ExpenseCardProps) {
  const payers = expense.payers
    .map((p) => participants.find((part) => part.id === p.participantId))
    .filter(Boolean) as Participant[];
  const cfg = CATEGORIES[expense.category] ?? CATEGORIES.other;
  const Icon = cfg.icon;

  const x = useMotionValue(0);
  const dragged = useRef(false);
  const revealOpacity = useTransform(x, [SWIPE_THRESHOLD, -24, 0], [1, 0.4, 0]);
  const trashScale = useTransform(x, [SWIPE_THRESHOLD - 20, -40, 0], [1.15, 0.85, 0.6]);

  const handleDragEnd = () => {
    if (x.get() <= SWIPE_THRESHOLD) {
      animate(x, -window.innerWidth, {
        duration: 0.22,
        ease: [0.4, 0, 1, 1],
        onComplete: () => onDelete(expense.id),
      });
    } else {
      animate(x, 0, { type: "spring", stiffness: 520, damping: 38 });
    }
    setTimeout(() => (dragged.current = false), 0);
  };

  const payerLabel =
    expense.category === "reimbursement"
      ? "Remboursement"
      : payers.length > 0
        ? `Payé par ${payers.map((p) => p.name).join(" & ")}`
        : "Payeur inconnu";

  return (
    <motion.li
      layout="position"
      initial={false}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
      className="relative overflow-hidden"
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-end bg-red-500 pr-6 text-white"
        style={{ opacity: revealOpacity }}
      >
        <motion.span className="flex items-center gap-2 text-sm font-semibold" style={{ scale: trashScale }}>
          <Trash2 size={18} />
          Supprimer
        </motion.span>
      </motion.div>

      <motion.button
        type="button"
        data-no-tab-swipe
        drag="x"
        dragConstraints={{ left: -200, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        dragDirectionLock
        style={{ x }}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (!dragged.current) onEdit(expense);
        }}
        aria-label={`${expense.title}, ${formatCurrency(expense.amountInTripCurrency, currency)}, ${payerLabel}`}
        className="relative flex w-full touch-pan-y items-center gap-3.5 bg-card px-4 text-left outline-none select-none transition-colors active:bg-secondary focus-visible:bg-secondary"
      >
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", cfg.bg)}>
          <Icon size={20} className={cfg.color} />
        </span>
        <span
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 py-3.5",
            !first && "border-t border-border"
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1rem] font-semibold text-foreground">{expense.title}</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              {payers.length > 0 && (
                <span className="flex -space-x-1">
                  {payers.slice(0, 3).map((p) => (
                    <span key={p.id} className="size-2.5 rounded-full ring-2 ring-card" style={{ backgroundColor: p.color }} />
                  ))}
                </span>
              )}
              <span className="truncate">{payerLabel}</span>
            </span>
          </span>
          <span className="tabular shrink-0 font-display text-[1.0625rem] font-bold tracking-tight">
            {formatCurrency(expense.amountInTripCurrency, currency)}
          </span>
        </span>
      </motion.button>
    </motion.li>
  );
}
