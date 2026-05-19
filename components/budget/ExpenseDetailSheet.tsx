"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/budget/categories";
import { computeShares } from "@/lib/budget/splits";
import { formatCurrency, currencySymbol } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import type { Expense, Participant } from "@/types";

interface ExpenseDetailSheetProps {
  expense: Expense | null;
  participants: Participant[];
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function ExpenseDetailSheet({
  expense,
  participants,
  currency,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ExpenseDetailSheetProps) {
  if (!expense) return null;

  const cfg = CATEGORIES[expense.category] ?? CATEGORIES.other;
  const Icon = cfg.icon;

  const payers = expense.payers
    .map((py) => {
      const p = participants.find((part) => part.id === py.participantId);
      return p ? { ...p, amount: py.amount } : null;
    })
    .filter(Boolean) as (Participant & { amount: number })[];

  const computedSplits = computeShares(
    expense.amountInTripCurrency,
    expense.splits,
    expense.splitMode
  );
  const activeSplits = computedSplits.filter((s) => !s.excluded);

  const sym = currencySymbol(currency);
  const multiPayer = expense.payers.length > 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="glass-strong border-foreground/10 rounded-t-2xl p-0 flex flex-col overflow-hidden"
        style={{ maxHeight: "88dvh" }}
      >
        <SheetTitle className="sr-only">Détail de la dépense</SheetTitle>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Hero — amount + title */}
          <div className="px-6 pt-6 pb-5">
            {/* Category chip */}
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4", cfg.bg)}>
              <Icon size={13} className={cfg.color} />
              <span className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</span>
            </div>

            <p className="text-5xl font-bold text-white tabular-nums leading-none">
              {formatCurrency(expense.amountInTripCurrency, currency)}
            </p>
            <p className="text-xl font-semibold text-slate-200 mt-2 leading-snug">
              {expense.title}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {parseLocalDate(expense.date).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>

          {/* Payé par */}
          <div className="border-t border-foreground/8 px-6 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Payé par
            </p>
            <div className="space-y-2.5">
              {payers.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-base font-medium text-slate-200">{p.name}</span>
                  </div>
                  {multiPayer && (
                    <span className="text-base font-semibold text-slate-300 tabular-nums">
                      {formatCurrency(p.amount, currency)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pour qui */}
          <div className="border-t border-foreground/8 px-6 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Pour qui
            </p>
            <div className="space-y-2.5">
              {activeSplits.map((split) => {
                const p = participants.find((pt) => pt.id === split.participantId);
                if (!p) return null;
                return (
                  <div key={split.participantId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="text-base font-medium text-slate-200">{p.name}</span>
                    </div>
                    <span className="text-base font-semibold text-slate-300 tabular-nums">
                      {formatCurrency(split.share ?? 0, currency)}
                      {expense.splitMode === "percentage" && split.percentage != null && (
                        <span className="text-xs text-slate-500 ml-1.5">
                          {Math.round(split.percentage)}%
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            {activeSplits.length !== participants.length && (
              <p className="text-xs text-slate-600 mt-3">
                {activeSplits.length} / {participants.length} participants
              </p>
            )}
          </div>

          {/* Mode de répartition badge */}
          <div className="px-6 pb-5">
            <span className="text-xs text-slate-600 bg-foreground/5 border border-foreground/8 px-2.5 py-1 rounded-full">
              {expense.splitMode === "equal"
                ? `Équitable · ${sym}`
                : expense.splitMode === "percentage"
                ? "Répartition %"
                : "Montants fixes"}
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div
          className="shrink-0 border-t border-foreground/8 px-5 py-4 flex gap-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        >
          <Button
            variant="ghost"
            onClick={onDelete}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
          >
            <Trash2 size={16} />
            Supprimer
          </Button>
          <Button
            onClick={onEdit}
            className="flex-1 gradient-primary text-white border-0 gap-2"
          >
            <Pencil size={15} />
            Modifier
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
