"use client";

import { AnimatePresence } from "framer-motion";
import { Receipt } from "lucide-react";
import { ExpenseCard } from "./ExpenseCard";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Expense, Participant } from "@/types";

interface ExpenseListProps {
  expenses: Expense[];
  participants: Participant[];
  currency: string;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

export function ExpenseList({
  expenses,
  participants,
  currency,
  onDelete,
  onEdit,
}: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Aucune dépense encore"
        description="Ajoute restos, transports, hébergement… Time to Go calcule automatiquement qui doit quoi à qui, et simplifie les remboursements."
      />
    );
  }

  const byDate = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    const key = e.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const sortedDates = Object.keys(byDate).sort((a, b) =>
    b.localeCompare(a)
  );

  return (
    <div className="space-y-5">
      {sortedDates.map((date) => (
        <div key={date}>
          <p className="text-sm text-slate-300 font-semibold mb-2.5 uppercase tracking-wider">
            {new Date(date).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <div className="space-y-2">
            <AnimatePresence>
              {byDate[date].map((expense) => (
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
      ))}
    </div>
  );
}
