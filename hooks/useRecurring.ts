"use client";

import { useCallback } from "react";
import { useSWRConfig } from "swr";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { createClient } from "@/lib/supabase/client";
import { anchorDayOf, nextRecurrence } from "@/lib/budget/recurrence";
import { computeShares } from "@/lib/budget/splits";
import { convertPayers, toTripAmount } from "@/lib/budget/currency";
import type { ExpenseCategory, ParticipantSplit, Payer, RecurrenceFrequency, RecurringExpense, SplitMode } from "@/types";

function rowToRecurring(row: Record<string, unknown>): RecurringExpense {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    title: row.title as string,
    amount: Number(row.amount),
    currency: row.currency as string,
    exchangeRate: Number(row.exchange_rate),
    category: row.category as ExpenseCategory,
    payers: (row.payers as Payer[]) ?? [],
    splitMode: row.split_mode as SplitMode,
    splits: (row.splits as ParticipantSplit[]) ?? [],
    frequency: row.frequency as RecurrenceFrequency,
    anchorDay: Number(row.anchor_day),
    nextDate: row.next_date as string,
  };
}

const NO_ITEMS: RecurringExpense[] = [];

export interface NewRecurring {
  title: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  category: ExpenseCategory;
  payers: Payer[];
  splitMode: SplitMode;
  splits: ParticipantSplit[];
  frequency: RecurrenceFrequency;
  /** Date de la première occurrence (déjà créée comme dépense normale). */
  firstDate: string;
}

export function useRecurring(tripId: string, enabled: boolean) {
  const { mutate } = useSWRConfig();
  const { data: items, loading, set, refetch } = useCachedQuery(
    tripId && enabled ? `recurring:${tripId}` : null,
    async () => {
      const { data } = await createClient()
        .from("recurring_expenses")
        .select("*")
        .eq("trip_id", tripId)
        .order("next_date");
      return (data ?? []).map(rowToRecurring);
    },
    NO_ITEMS
  );

  const create = async (d: NewRecurring) => {
    const total = toTripAmount(d.amount, d.exchangeRate);
    const { data, error } = await createClient()
      .from("recurring_expenses")
      .insert({
        trip_id: tripId,
        title: d.title,
        amount: d.amount,
        currency: d.currency,
        exchange_rate: d.exchangeRate,
        category: d.category,
        payers: convertPayers(d.payers, d.exchangeRate, total),
        split_mode: d.splitMode,
        splits: computeShares(total, d.splits, d.splitMode),
        frequency: d.frequency,
        anchor_day: anchorDayOf(d.firstDate),
        next_date: nextRecurrence(d.firstDate, d.frequency, anchorDayOf(d.firstDate)),
      })
      .select()
      .single();
    if (error) throw error;
    set((prev) => [...prev, rowToRecurring(data)]);
  };

  const remove = async (id: string) => {
    const snapshot = items;
    set((prev) => prev.filter((r) => r.id !== id));
    const { error } = await createClient().from("recurring_expenses").delete().eq("id", id);
    if (error) {
      set(snapshot);
      throw error;
    }
  };

  /** Crée les dépenses échues (côté serveur, sans doublon) puis recharge ce qui a changé. */
  const applyDue = useCallback(async () => {
    if (!tripId || (typeof navigator !== "undefined" && !navigator.onLine)) return 0;
    const { data, error } = await createClient().rpc("apply_recurring_expenses", { p_trip_id: tripId });
    if (error) return 0;
    const created = Number(data ?? 0);
    if (created > 0) await Promise.all([mutate(`expenses:${tripId}`), mutate(`recurring:${tripId}`)]);
    return created;
  }, [tripId, mutate]);

  return { items, loading, refetch, create, remove, applyDue };
}
