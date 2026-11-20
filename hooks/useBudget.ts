"use client";

import { createClient } from "@/lib/supabase/client";
import { computeShares } from "@/lib/budget/splits";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import type { Expense, Payer } from "@/types";
import { notify } from "@/lib/notifications/notify";

function rowToExpense(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    title: row.title as string,
    amount: row.amount as number,
    currency: row.currency as string,
    exchangeRate: row.exchange_rate as number,
    amountInTripCurrency: row.amount_in_trip_currency as number,
    category: row.category as Expense["category"],
    payers: Array.isArray(row.payers) && (row.payers as Payer[]).length > 0
      ? (row.payers as Payer[])
      : [{ participantId: row.paid_by_id as string, amount: row.amount_in_trip_currency as number }],
    date: row.date as string,
    splitMode: row.split_mode as Expense["splitMode"],
    splits: row.splits as Expense["splits"],
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const NO_EXPENSES: Expense[] = [];

export async function fetchExpenseRows(tripId: string): Promise<Expense[]> {
  const { data } = await createClient()
    .from("expenses")
    .select("*")
    .eq("trip_id", tripId)
    .order("date", { ascending: false });
  return (data ?? []).map(rowToExpense);
}

export function useBudget(tripId: string) {
  const { data: expenses, loading, set: setExpenses, refetch: fetchExpenses } = useCachedQuery(
    tripId ? `expenses:${tripId}` : null,
    () => fetchExpenseRows(tripId),
    NO_EXPENSES
  );

  const addExpense = async (
    data: Omit<Expense, "id" | "createdAt" | "updatedAt" | "amountInTripCurrency">
  ): Promise<string> => {
    const amountInTripCurrency = data.amount * data.exchangeRate;
    const computedSplits = computeShares(amountInTripCurrency, data.splits, data.splitMode);

    const { data: row, error } = await createClient()
      .from("expenses")
      .insert({
        trip_id: data.tripId,
        title: data.title,
        amount: data.amount,
        currency: data.currency,
        exchange_rate: data.exchangeRate,
        amount_in_trip_currency: amountInTripCurrency,
        category: data.category,
        paid_by_id: data.payers[0]?.participantId ?? null,
        payers: data.payers.map(p => ({ participantId: p.participantId, amount: p.amount * data.exchangeRate })),
        date: data.date,
        split_mode: data.splitMode,
        splits: computedSplits,
        notes: data.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    const newExpense = rowToExpense(row);
    setExpenses(prev =>
      [newExpense, ...prev].sort((a, b) => b.date.localeCompare(a.date))
    );
    notify({ event: "expense", tripId: data.tripId, id: row.id });
    return row.id;
  };

  const updateExpense = async (
    id: string,
    data: Partial<Omit<Expense, "id" | "createdAt">>
  ): Promise<void> => {
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return;

    const amount = data.amount ?? existing.amount;
    const exchangeRate = data.exchangeRate ?? existing.exchangeRate;
    const splits = data.splits ?? existing.splits;
    const splitMode = data.splitMode ?? existing.splitMode;
    const amountInTripCurrency = amount * exchangeRate;
    const computedSplits = computeShares(amountInTripCurrency, splits, splitMode);
    const updated: Expense = {
      ...existing, ...data, amountInTripCurrency, splits: computedSplits,
      updatedAt: new Date().toISOString(),
    };

    setExpenses(prev => prev.map(e => e.id === id ? updated : e));

    const { error } = await createClient().from("expenses").update({
      ...(data.title && { title: data.title }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.currency && { currency: data.currency }),
      ...(data.exchangeRate !== undefined && { exchange_rate: data.exchangeRate }),
      amount_in_trip_currency: amountInTripCurrency,
      ...(data.category && { category: data.category }),
      ...(data.payers !== undefined && {
        paid_by_id: data.payers[0]?.participantId ?? null,
        payers: data.payers.map(p => ({ participantId: p.participantId, amount: p.amount * (data.exchangeRate ?? existing.exchangeRate) })),
      }),
      ...(data.date && { date: data.date }),
      ...(data.splitMode && { split_mode: data.splitMode }),
      splits: computedSplits,
      ...(data.notes !== undefined && { notes: data.notes }),
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) {
      setExpenses(prev => prev.map(e => e.id === id ? existing : e));
      throw error;
    }
  };

  const deleteExpense = async (id: string): Promise<void> => {
    const snapshot = expenses;
    setExpenses(es => es.filter(e => e.id !== id));
    const { error } = await createClient().from("expenses").delete().eq("id", id);
    if (error) { setExpenses(snapshot); throw error; }
  };

  const totalSpent = expenses
    .filter((e) => e.category !== "reimbursement")
    .reduce((acc, e) => acc + e.amountInTripCurrency, 0);

  return { expenses, loading, refetch: fetchExpenses, addExpense, updateExpense, deleteExpense, totalSpent };
}
