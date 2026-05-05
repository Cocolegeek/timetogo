"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { computeShares } from "@/lib/budget/splits";
import type { Expense } from "@/types";

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
    paidById: row.paid_by_id as string,
    date: row.date as string,
    splitMode: row.split_mode as Expense["splitMode"],
    splits: row.splits as Expense["splits"],
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function useBudget(tripId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("trip_id", tripId)
      .order("date", { ascending: false });
    setExpenses((data ?? []).map(rowToExpense));
    setLoading(false);
  }, [tripId]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const addExpense = async (
    data: Omit<Expense, "id" | "createdAt" | "updatedAt" | "amountInTripCurrency">
  ): Promise<string> => {
    const supabase = createClient();
    const amountInTripCurrency = data.amount * data.exchangeRate;
    const computedSplits = computeShares(amountInTripCurrency, data.splits, data.splitMode);

    const { data: row, error } = await supabase
      .from("expenses")
      .insert({
        trip_id: data.tripId,
        title: data.title,
        amount: data.amount,
        currency: data.currency,
        exchange_rate: data.exchangeRate,
        amount_in_trip_currency: amountInTripCurrency,
        category: data.category,
        paid_by_id: data.paidById,
        date: data.date,
        split_mode: data.splitMode,
        splits: computedSplits,
        notes: data.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchExpenses();
    return row.id;
  };

  const updateExpense = async (
    id: string,
    data: Partial<Omit<Expense, "id" | "createdAt">>
  ): Promise<void> => {
    const supabase = createClient();
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return;

    const amount = data.amount ?? existing.amount;
    const exchangeRate = data.exchangeRate ?? existing.exchangeRate;
    const splits = data.splits ?? existing.splits;
    const splitMode = data.splitMode ?? existing.splitMode;
    const amountInTripCurrency = amount * exchangeRate;
    const computedSplits = computeShares(amountInTripCurrency, splits, splitMode);

    await supabase.from("expenses").update({
      ...(data.title && { title: data.title }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.currency && { currency: data.currency }),
      ...(data.exchangeRate !== undefined && { exchange_rate: data.exchangeRate }),
      amount_in_trip_currency: amountInTripCurrency,
      ...(data.category && { category: data.category }),
      ...(data.paidById && { paid_by_id: data.paidById }),
      ...(data.date && { date: data.date }),
      ...(data.splitMode && { split_mode: data.splitMode }),
      splits: computedSplits,
      ...(data.notes !== undefined && { notes: data.notes }),
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    await fetchExpenses();
  };

  const deleteExpense = async (id: string): Promise<void> => {
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", id);
    await fetchExpenses();
  };

  const totalSpent = expenses.reduce((acc, e) => acc + e.amountInTripCurrency, 0);

  return {
    expenses,
    loading,
    refetch: fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    totalSpent,
  };
}
