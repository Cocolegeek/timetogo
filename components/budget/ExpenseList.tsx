"use client";

import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Receipt } from "lucide-react";
import { ExpenseCard } from "./ExpenseCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/format-currency";
import type { Expense, Participant } from "@/types";

interface ExpenseListProps {
  expenses: Expense[];
  participants: Participant[];
  currency: string;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function ExpenseList({
  expenses,
  participants,
  currency,
  onDelete,
  onEdit,
}: ExpenseListProps) {
  const { byDate, sortedDates } = useMemo(() => {
    const grouped = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
      if (!acc[e.date]) acc[e.date] = [];
      acc[e.date].push(e);
      return acc;
    }, {});
    return {
      byDate: grouped,
      sortedDates: Object.keys(grouped).sort((a, b) => b.localeCompare(a)),
    };
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Aucune dépense encore"
        description="Ajoute restos, transports, hébergement… Voyou calcule automatiquement qui doit quoi à qui, et simplifie les remboursements."
      />
    );
  }

  return (
    <div className="space-y-5">
      {sortedDates.map((date) => {
        const dayExpenses = byDate[date];
        const dayTotal = dayExpenses.reduce(
          (sum, e) => sum + e.amountInTripCurrency,
          0
        );
        return (
          <div key={date}>
            {/* Sticky date header */}
            <div className="sticky top-0 z-10 -mx-1 px-1 py-1.5 mb-2 backdrop-blur-md bg-black/50 flex items-center justify-between rounded-lg">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {parseLocalDate(date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <span className="text-xs text-slate-500 tabular-nums shrink-0 ml-2">
                {dayExpenses.length > 1 && `${dayExpenses.length} · `}
                {formatCurrency(dayTotal, currency)}
              </span>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {dayExpenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    participants={participants}
                    currency={currency}
                    onDelete={onDelete}
                    onEdit={onEdit}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
