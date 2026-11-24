"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/budget/categories";
import { computeShares } from "@/lib/budget/splits";
import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
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

  const multiPayer = expense.payers.length > 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 flex flex-col overflow-hidden"
        style={{ maxHeight: "88dvh" }}
      >
        <SheetTitle className="sr-only">Détail de la dépense</SheetTitle>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-9 pb-6 text-center">
            <span className={cn("mx-auto flex size-14 items-center justify-center rounded-[1.1rem]", cfg.bg)}>
              <Icon size={26} className={cfg.color} />
            </span>
            <p className="tabular mt-4 font-display text-[3rem] leading-none font-extrabold tracking-[-0.04em]">
              {formatCurrency(expense.amountInTripCurrency, currency)}
            </p>
            {expense.currency !== currency && (
              <p className="tabular mt-2 text-sm text-muted-foreground">
                {formatCurrency(expense.amount, expense.currency)} · 1 {expense.currency} = {expense.exchangeRate.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} {currency}
              </p>
            )}
            <p className="mt-2 text-lg font-semibold">{expense.title}</p>
            <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
              {cfg.label} ·{" "}
              {parseLocalDate(expense.date).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>

          <div className="space-y-5 px-5 pb-6">
            <section>
              <h3 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">Payé par</h3>
              <ul className="overflow-hidden rounded-[1.25rem] bg-secondary">
                {payers.map((p, i) => (
                  <li key={p.id} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-border")}>
                    <ParticipantAvatar participant={p} size="sm" />
                    <span className="flex-1 font-medium">{p.name}</span>
                    <span className="tabular font-semibold">{formatCurrency(multiPayer ? p.amount : expense.amountInTripCurrency, currency)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="mb-2 flex items-center justify-between px-1 text-sm font-semibold text-muted-foreground">
                <span>Pour qui</span>
                <span className="font-medium">
                  {expense.splitMode === "equal"
                    ? `Équitable${activeSplits.length !== participants.length ? ` · ${activeSplits.length}/${participants.length}` : ""}`
                    : expense.splitMode === "percentage"
                      ? "En pourcentages"
                      : "Montants fixes"}
                </span>
              </h3>
              <ul className="overflow-hidden rounded-[1.25rem] bg-secondary">
                {activeSplits.map((split, i) => {
                  const p = participants.find((pt) => pt.id === split.participantId);
                  if (!p) return null;
                  return (
                    <li key={split.participantId} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-border")}>
                      <ParticipantAvatar participant={p} size="sm" />
                      <span className="flex-1 font-medium">{p.name}</span>
                      {expense.splitMode === "percentage" && split.percentage != null && (
                        <span className="text-sm text-muted-foreground">{Math.round(split.percentage)} %</span>
                      )}
                      <span className="tabular font-semibold">{formatCurrency(split.share ?? 0, currency)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-border px-5 pt-3 pb-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={onDelete}
            className="text-red-400 hover:text-red-400"
            aria-label="Supprimer la dépense"
          >
            <Trash2 size={18} />
          </Button>
          <Button size="lg" onClick={onEdit} className="flex-1 shadow-section">
            <Pencil size={16} />
            Modifier
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
