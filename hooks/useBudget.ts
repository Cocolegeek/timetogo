"use client";

import { createClient } from "@/lib/supabase/client";
import { computeShares } from "@/lib/budget/splits";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import type { Expense, Payer } from "@/types";
import { notify } from "@/lib/notifications/notify";
import { convertPayers, toTripAmount } from "@/lib/budget/currency";
import { enqueue, getOutbox, isOfflineError, newRowId } from "@/lib/offline/outbox";

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
  const fromServer = (data ?? []).map(rowToExpense);
  return withPendingChanges(tripId, fromServer);
}

/** Une revalidation ne doit pas faire disparaître ce qui attend encore d'être envoyé. */
function withPendingChanges(tripId: string, serverExpenses: Expense[]): Expense[] {
  const queue = getOutbox().filter((o) => o.table === "expenses");
  if (queue.length === 0) return serverExpenses;
  const deleted = new Set(queue.filter((o) => o.kind === "delete").map((o) => o.rowId));
  const known = new Set(serverExpenses.map((e) => e.id));
  const added = queue
    .filter((o) => o.kind === "insert" && o.row.trip_id === tripId && !known.has(o.rowId))
    .map((o) => {
      const now = new Date().toISOString();
      return { ...rowToExpense({ ...(o as { row: Record<string, unknown> }).row, created_at: now, updated_at: now }), pending: true };
    });
  return [...added, ...serverExpenses]
    .filter((e) => !deleted.has(e.id))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function useBudget(tripId: string) {
  const { data: expenses, loading, set: setExpenses, refetch: fetchExpenses } = useCachedQuery(
    tripId ? `expenses:${tripId}` : null,
    () => fetchExpenseRows(tripId),
    NO_EXPENSES
  );

  const cacheKey = `expenses:${tripId}`;

  const addExpense = async (
    data: Omit<Expense, "id" | "createdAt" | "updatedAt" | "amountInTripCurrency">
  ): Promise<string> => {
    const amountInTripCurrency = toTripAmount(data.amount, data.exchangeRate);
    const computedSplits = computeShares(amountInTripCurrency, data.splits, data.splitMode);
    const id = newRowId();
    const insertRow = {
      id,
      trip_id: data.tripId,
      title: data.title,
      amount: data.amount,
      currency: data.currency,
      exchange_rate: data.exchangeRate,
      amount_in_trip_currency: amountInTripCurrency,
      category: data.category,
      paid_by_id: data.payers[0]?.participantId ?? null,
      payers: convertPayers(data.payers, data.exchangeRate, amountInTripCurrency),
      date: data.date,
      split_mode: data.splitMode,
      splits: computedSplits,
      notes: data.notes ?? null,
    };
    const event = { event: "expense", tripId: data.tripId, id } as const;

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("offline");
      const { data: row, error } = await createClient().from("expenses").insert(insertRow).select().single();
      if (error) throw error;
      const newExpense = rowToExpense(row);
      setExpenses(prev => [newExpense, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      notify(event);
      return id;
    } catch (err) {
      if (!isOfflineError(err)) throw err;
      enqueue({ kind: "insert", table: "expenses", rowId: id, row: insertRow, cacheKey, after: event });
      const now = new Date().toISOString();
      const local = { ...rowToExpense({ ...insertRow, created_at: now, updated_at: now }), pending: true };
      setExpenses(prev => [local, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      return id;
    }
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
    const amountInTripCurrency = toTripAmount(amount, exchangeRate);
    const computedSplits = computeShares(amountInTripCurrency, splits, splitMode);
    const payers = data.payers !== undefined ? convertPayers(data.payers, exchangeRate, amountInTripCurrency) : undefined;
    const updated: Expense = {
      ...existing, ...data, amountInTripCurrency, splits: computedSplits,
      ...(payers && { payers }),
      updatedAt: new Date().toISOString(),
    };

    setExpenses(prev => prev.map(e => e.id === id ? updated : e));

    const patch = {
      ...(data.title && { title: data.title }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.currency && { currency: data.currency }),
      ...(data.exchangeRate !== undefined && { exchange_rate: data.exchangeRate }),
      amount_in_trip_currency: amountInTripCurrency,
      ...(data.category && { category: data.category }),
      ...(payers && { paid_by_id: payers[0]?.participantId ?? null, payers }),
      ...(data.date && { date: data.date }),
      ...(data.splitMode && { split_mode: data.splitMode }),
      splits: computedSplits,
      ...(data.notes !== undefined && { notes: data.notes }),
      updated_at: new Date().toISOString(),
    };

    if (existing.pending) {
      enqueue({ kind: "update", table: "expenses", rowId: id, patch, cacheKey });
      return;
    }
    const { error } = await createClient().from("expenses").update(patch).eq("id", id);
    if (error) {
      if (isOfflineError(error)) {
        enqueue({ kind: "update", table: "expenses", rowId: id, patch, cacheKey });
        setExpenses(prev => prev.map(e => e.id === id ? { ...updated, pending: true } : e));
        return;
      }
      setExpenses(prev => prev.map(e => e.id === id ? existing : e));
      throw error;
    }
  };

  const deleteExpense = async (id: string): Promise<void> => {
    const snapshot = expenses;
    const wasPending = snapshot.find((e) => e.id === id)?.pending;
    setExpenses(es => es.filter(e => e.id !== id));
    if (wasPending) {
      enqueue({ kind: "delete", table: "expenses", rowId: id, cacheKey });
      return;
    }
    const { error } = await createClient().from("expenses").delete().eq("id", id);
    if (error) {
      if (isOfflineError(error)) {
        enqueue({ kind: "delete", table: "expenses", rowId: id, cacheKey });
        return;
      }
      setExpenses(snapshot);
      throw error;
    }
  };

  const totalSpent = expenses
    .filter((e) => e.category !== "reimbursement")
    .reduce((acc, e) => acc + e.amountInTripCurrency, 0);

  return { expenses, loading, refetch: fetchExpenses, addExpense, updateExpense, deleteExpense, totalSpent };
}
