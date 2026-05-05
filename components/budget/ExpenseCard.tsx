"use client";

import { motion } from "framer-motion";
import { Trash2, Pencil } from "lucide-react";
import { CategoryPill } from "./CategoryPill";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Expense, Participant } from "@/types";

interface ExpenseCardProps {
  expense: Expense;
  participants: Participant[];
  currency: string;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="glass-subtle rounded-xl p-4 group"
    >
      <div className="flex items-start gap-3">
        {/* Payer avatar */}
        {payer && <ParticipantAvatar participant={payer} size="sm" className="mt-0.5" />}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-slate-100 text-sm truncate">{expense.title}</p>
            <span className="font-semibold text-slate-100 text-sm shrink-0">
              {formatAmount(expense.amountInTripCurrency, currency)}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <CategoryPill category={expense.category} size="sm" />
            <span className="text-xs text-slate-500">
              Payé par{" "}
              <span className="text-slate-400">{payer?.name ?? "?"}</span>
            </span>
            <span className="text-xs text-slate-600">
              {new Date(expense.date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-200"
            onClick={() => onEdit(expense)}
          >
            <Pencil size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-red-400"
            onClick={() => onDelete(expense.id)}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
