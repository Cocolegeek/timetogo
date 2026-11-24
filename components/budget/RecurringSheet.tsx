"use client";

import { Repeat, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { FREQUENCY_LABELS } from "@/lib/budget/recurrence";
import { formatCurrency } from "@/lib/format-currency";
import type { RecurringExpense } from "@/types";

function day(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

interface RecurringSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: RecurringExpense[];
  currency: string;
  onRemove: (id: string, label: string) => void;
}

export default function RecurringSheet({ open, onOpenChange, items, currency, onRemove }: RecurringSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex flex-col overflow-hidden p-0" style={{ maxHeight: "88dvh" }}>
        <div className="shrink-0 px-5 pt-7 pr-16 pb-3">
          <SheetTitle>Dépenses répétées</SheetTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoutées toutes seules à chaque échéance. Supprimer une ligne arrête la répétition, pas les dépenses déjà créées.
          </p>
        </div>
        <ul className="flex-1 overflow-y-auto px-5 pb-6">
          {items.length === 0 && <li className="py-8 text-center text-muted-foreground">Aucune dépense répétée.</li>}
          {items.map((r, i) => (
            <li key={r.id} className={`flex items-center gap-3 py-3.5 ${i > 0 ? "border-t border-border" : ""}`}>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-foreground/[0.07]">
                <Repeat size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.title}</p>
                <p className="text-sm text-muted-foreground">
                  {FREQUENCY_LABELS[r.frequency]} · prochaine le {day(r.nextDate)}
                </p>
              </div>
              <span className="tabular shrink-0 font-display font-bold">{formatCurrency(r.amount, r.currency || currency)}</span>
              <button
                type="button"
                onClick={() => onRemove(r.id, "Répétition arrêtée")}
                aria-label={`Arrêter la répétition de ${r.title}`}
                className="pressable flex size-11 shrink-0 items-center justify-center rounded-full text-red-400 transition-colors hover:bg-red-500/10"
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
