"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildDefaultMealRows, DEFAULT_SLOTS } from "@/lib/meals/slots";
import type { Ingredient, Meal, MealCategory, MealSlot } from "@/types";

function rowToMeal(row: Record<string, unknown>): Meal {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    date: row.date as string,
    slot: row.slot as MealSlot,
    category: ((row.category as string) ?? "home") as MealCategory,
    title: row.title as string,
    notes: (row.notes as string | null) ?? undefined,
    participantIds: Array.isArray(row.participant_ids) ? (row.participant_ids as string[]) : [],
    cookIds: Array.isArray(row.cook_ids) ? (row.cook_ids as string[]) : [],
    ingredients: Array.isArray(row.ingredients) ? (row.ingredients as Ingredient[]) : [],
    position: (row.position as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

export function useMeals(
  tripId: string,
  range?: { startDate: string; endDate: string }
) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    const { data } = await supabase
      .from("meals")
      .select("*")
      .eq("trip_id", tripId)
      .in("slot", ["breakfast", "lunch", "dinner"])
      .order("date")
      .order("position");

    let result = (data ?? []).map(rowToMeal);

    if (result.length === 0 && range) {
      const rows = buildDefaultMealRows(tripId, range.startDate, range.endDate);
      if (rows.length > 0) {
        const { data: inserted } = await supabase.from("meals").insert(rows).select();
        result = (inserted ?? []).map(rowToMeal);
      }
    }

    setMeals(result);
    setLoading(false);
  }, [tripId, range?.startDate, range?.endDate]);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

  const updateMeal = async (
    id: string,
    data: Partial<Pick<Meal, "title" | "category" | "notes" | "participantIds" | "cookIds" | "ingredients">>
  ): Promise<void> => {
    const snapshot = meals;
    setMeals(ms => ms.map(m => m.id === id ? { ...m, ...data } : m));

    const { error } = await createClient().from("meals").update({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.notes !== undefined && { notes: data.notes ?? null }),
      ...(data.participantIds !== undefined && { participant_ids: data.participantIds }),
      ...(data.cookIds !== undefined && { cook_ids: data.cookIds }),
      ...(data.ingredients !== undefined && { ingredients: data.ingredients }),
    }).eq("id", id);

    if (error) { setMeals(snapshot); throw new Error(error.message); }
  };

  const addMeal = async (date: string, slot: MealSlot): Promise<Meal> => {
    const position = DEFAULT_SLOTS.find(s => s.slot === slot)?.position ?? 0;
    const { data, error } = await createClient().from("meals").insert({
      trip_id: tripId, date, slot, title: "", category: "home",
      position, participant_ids: [], cook_ids: [], ingredients: [],
    }).select().single();
    if (error) throw new Error(error.message);
    const meal = rowToMeal(data as Record<string, unknown>);
    setMeals(ms => [...ms, meal].sort((a, b) => a.date.localeCompare(b.date) || a.position - b.position));
    return meal;
  };

  const deleteMeal = async (id: string): Promise<void> => {
    const snapshot = meals;
    setMeals(ms => ms.filter(m => m.id !== id));
    const { error } = await createClient().from("meals").delete().eq("id", id);
    if (error) { setMeals(snapshot); throw new Error(error.message); }
  };

  return { meals, loading, refetch: fetchMeals, addMeal, updateMeal, deleteMeal };
}
