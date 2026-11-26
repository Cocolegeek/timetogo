"use client";

import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Receipt } from "lucide-react";
import { ExpenseCard } from "./ExpenseCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { formatCurrency } from "@/lib/format-currency";
import type { Expense, Participant } from "@/types";

interface ExpenseListProps {
  expenses: Expense[];
  participants: Participant[];
  currency: string;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
  onQuickEdit?: (expense: Expense) => void;
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dayLabel(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  const label = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function ExpenseList({ expenses, participants, currency, onDelete, onEdit, onQuickEdit }: ExpenseListProps) {
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
        title="Aucune dépense"
        description="Ajoute restos, transports, logement… Voyou calcule qui doit quoi à qui et simplifie les remboursements."
      />
    );
  }

  return (
    <Stagger step={0.05} className="space-y-6">
      {sortedDates.map((date) => {
        const dayExpenses = byDate[date];
        const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amountInTripCurrency, 0);
        return (
          <StaggerItem key={date}>
            <section aria-label={dayLabel(date)}>
              <div className="mb-2.5 flex items-baseline justify-between px-1">
                <h3 className="font-display text-[1.05rem] font-bold tracking-tight">{dayLabel(date)}</h3>
                <span className="tabular text-sm font-medium text-muted-foreground">{formatCurrency(dayTotal, currency)}</span>
              </div>
              <ul className="overflow-hidden rounded-[1.5rem] bg-card shadow-card">
                <AnimatePresence initial={false}>
                  {dayExpenses.map((expense, i) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      participants={participants}
                      currency={currency}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onQuickEdit={onQuickEdit}
                      first={i === 0}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          </StaggerItem>
        );
      })}
      <p className="pt-1 text-center text-[0.8125rem] text-muted-foreground">Glisse une dépense vers la gauche pour la supprimer.</p>
    </Stagger>
  );
}
