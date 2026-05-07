"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildDefaultMealRows } from "@/lib/meals/slots";
import type { Ingredient, Meal, MealCategory, MealSlot } from "@/types";

function rowToMeal(row: Record<string, unknown>): Meal {
  const participantIds = Array.isArray(row.participant_ids)
    ? (row.participant_ids as string[])
    : [];
  const cookIds = Array.isArray(row.cook_ids) ? (row.cook_ids as string[]) : [];
  const ingredients = Array.isArray(row.ingredients)
    ? (row.ingredients as Ingredient[])
    : [];
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    date: row.date as string,
    slot: row.slot as MealSlot,
    category: ((row.category as string) ?? "home") as MealCategory,
    title: row.title as string,
    notes: (row.notes as string | null) ?? undefined,
    participantIds,
    cookIds,
    ingredients,
    position: (row.position as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

export function useMeals(
  tripId: string,
  /** Trip date range — needed to auto-generate slots for legacy trips. */
  range?: { startDate: string; endDate: string }
) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("meals")
      .select("*")
      .eq("trip_id", tripId)
      .in("slot", ["breakfast", "lunch", "dinner"]) // ignore any legacy snack/apero/extra rows
      .order("date")
      .order("position");

    let result = (data ?? []).map(rowToMeal);

    // Legacy auto-gen: trips created before the meals feature existed
    // get their default slots created on first visit.
    if (result.length === 0 && range) {
      const rows = buildDefaultMealRows(tripId, range.startDate, range.endDate);
      if (rows.length > 0) {
        const { data: inserted } = await supabase
          .from("meals")
          .insert(rows)
          .select();
        result = (inserted ?? []).map(rowToMeal);
      }
    }

    setMeals(result);
    setLoading(false);
  }, [tripId, range?.startDate, range?.endDate]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const updateMeal = async (
    id: string,
    data: Partial<
      Pick<
        Meal,
        | "title"
        | "category"
        | "notes"
        | "participantIds"
        | "cookIds"
        | "ingredients"
      >
    >
  ): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("meals")
      .update({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.notes !== undefined && { notes: data.notes ?? null }),
        ...(data.participantIds !== undefined && {
          participant_ids: data.participantIds,
        }),
        ...(data.cookIds !== undefined && { cook_ids: data.cookIds }),
        ...(data.ingredients !== undefined && {
          ingredients: data.ingredients,
        }),
      })
      .eq("id", id);
    if (error) {
      console.error("updateMeal failed:", error);
      throw new Error(error.message);
    }
    await fetchMeals();
  };

  const deleteMeal = async (id: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) {
      console.error("deleteMeal failed:", error);
      throw new Error(error.message);
    }
    await fetchMeals();
  };

  return {
    meals,
    loading,
    refetch: fetchMeals,
    updateMeal,
    deleteMeal,
  };
}
