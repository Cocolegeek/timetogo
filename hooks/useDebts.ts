"use client";

import { useMemo } from "react";
import { computeBalances, simplifyDebts } from "@/lib/budget/debts";
import type { Expense, Participant } from "@/types";

export function useDebts(expenses: Expense[], participants: Participant[]) {
  const balances = useMemo(
    () => computeBalances(expenses, participants),
    [expenses, participants]
  );

  const settlements = useMemo(() => simplifyDebts(balances), [balances]);

  return { balances, settlements };
}
