import type { Expense, Participant } from "@/types";

const SEP = ";";

function cell(value: string | number): string {
  const text = typeof value === "number" ? String(value).replace(".", ",") : value;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * CSV lisible par Excel / Numbers en français : séparateur « ; », décimales avec virgule,
 * BOM UTF-8 pour les accents.
 */
export function buildExpensesCsv(
  expenses: Expense[],
  participants: Participant[],
  tripCurrency: string,
  categoryLabel: (category: Expense["category"]) => string
): string {
  const name = (id: string) => participants.find((p) => p.id === id)?.name ?? "?";
  const rows: (string | number)[][] = [
    ["Date", "Titre", "Catégorie", "Montant", "Devise", "Taux", `Montant (${tripCurrency})`, "Payé par", "Répartition"],
    ...[...expenses]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => [
        e.date,
        e.title,
        categoryLabel(e.category),
        e.amount,
        e.currency,
        e.exchangeRate,
        e.amountInTripCurrency,
        e.payers.map((p) => `${name(p.participantId)} (${String(p.amount).replace(".", ",")})`).join(" + "),
        e.splits
          .filter((s) => !s.excluded)
          .map((s) => `${name(s.participantId)} (${String(s.share ?? 0).replace(".", ",")})`)
          .join(" + "),
      ]),
  ];
  return "﻿" + rows.map((r) => r.map(cell).join(SEP)).join("\r\n") + "\r\n";
}
