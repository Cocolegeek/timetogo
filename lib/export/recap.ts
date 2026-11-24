import type { Balance, Expense, Participant, Settlement } from "@/types";

export interface RecapInput {
  tripName: string;
  currency: string;
  expenses: Expense[];
  participants: Participant[];
  balances: Balance[];
  settlements: Settlement[];
  format: (amount: number, currency: string) => string;
}

/** Récap partageable (WhatsApp, SMS…) : total, ce que chacun a avancé, qui doit combien à qui. */
export function buildRecap({ tripName, currency, expenses, participants, balances, settlements, format }: RecapInput): string {
  const name = (id: string) => participants.find((p) => p.id === id)?.name ?? "?";
  const spent = expenses.filter((e) => e.category !== "reimbursement");
  const total = spent.reduce((sum, e) => sum + e.amountInTripCurrency, 0);

  const lines = [`${tripName} · récap des comptes`, "", `Total dépensé : ${format(total, currency)} (${spent.length} dépense${spent.length > 1 ? "s" : ""})`];

  const paid = balances.filter((b) => b.paid > 0.004).sort((a, b) => b.paid - a.paid);
  if (paid.length > 0) {
    lines.push("", "Avancé par chacun :");
    for (const b of paid) lines.push(`• ${name(b.participantId)} : ${format(b.paid, currency)}`);
  }

  lines.push("");
  if (settlements.length === 0) {
    lines.push("Tout le monde est quitte ✅");
  } else {
    lines.push("Pour être quittes :");
    for (const s of settlements) lines.push(`→ ${name(s.fromId)} paie ${format(s.amount, currency)} à ${name(s.toId)}`);
  }
  lines.push("", "Calculé avec Voyou");
  return lines.join("\n");
}
