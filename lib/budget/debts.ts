import type { Balance, Settlement, Expense, Participant } from "@/types";

export function computeBalances(
  expenses: Expense[],
  participants: Participant[]
): Balance[] {
  const paid: Record<string, number> = {};
  const owes: Record<string, number> = {};

  for (const p of participants) {
    paid[p.id] = 0;
    owes[p.id] = 0;
  }

  for (const expense of expenses) {
    paid[expense.paidById] =
      (paid[expense.paidById] ?? 0) + expense.amountInTripCurrency;

    for (const split of expense.splits) {
      owes[split.participantId] =
        (owes[split.participantId] ?? 0) + (split.share ?? 0);
    }
  }

  return participants.map((p) => ({
    participantId: p.id,
    paid: paid[p.id] ?? 0,
    owes: owes[p.id] ?? 0,
    net: (paid[p.id] ?? 0) - (owes[p.id] ?? 0),
  }));
}

/**
 * Greedy algorithm: réduit le nombre de virements au minimum.
 * Complexité O(n log n). Exemple : A doit 10 à B, B doit 10 à C → A doit 10 à C.
 */
export function simplifyDebts(balances: Balance[]): Settlement[] {
  const EPSILON = 0.005;

  const nets = balances.map((b) => ({ id: b.participantId, net: b.net }));

  const creditors = nets
    .filter((n) => n.net > EPSILON)
    .sort((a, b) => b.net - a.net);
  const debtors = nets
    .filter((n) => n.net < -EPSILON)
    .sort((a, b) => a.net - b.net);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i].net;
    const debt = Math.abs(debtors[j].net);
    const amount = Math.round(Math.min(credit, debt) * 100) / 100;

    settlements.push({
      fromId: debtors[j].id,
      toId: creditors[i].id,
      amount,
    });

    creditors[i].net -= amount;
    debtors[j].net += amount;

    if (Math.abs(creditors[i].net) < EPSILON) i++;
    if (Math.abs(debtors[j].net) < EPSILON) j++;
  }

  return settlements;
}
