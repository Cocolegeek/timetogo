"use client";

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import { buildDefaultMealRows } from "@/lib/meals/slots";
import type { Dish, Meal, MealSlot } from "@/types";

function rowToMeal(row: Record<string, unknown>): Meal {
  const participantIds = Array.isArray(row.participant_ids)
    ? (row.participant_ids as string[])
    : [];
  const dishes = Array.isArray(row.dishes) ? (row.dishes as Dish[]) : [];
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    date: row.date as string,
    slot: row.slot as MealSlot,
    title: row.title as string,
    notes: (row.notes as string | null) ?? undefined,
    participantIds,
    dishes,
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
    data: Partial<Pick<Meal, "title" | "notes" | "participantIds" | "dishes">>
  ): Promise<void> => {
    const supabase = createClient();
    await supabase
      .from("meals")
      .update({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.notes !== undefined && { notes: data.notes ?? null }),
        ...(data.participantIds !== undefined && {
          participant_ids: data.participantIds,
        }),
        ...(data.dishes !== undefined && { dishes: data.dishes }),
      })
      .eq("id", id);
    await fetchMeals();
  };

  /** Add an extra meal slot to a given date (e.g. another apero, snack…). */
  const addExtraMeal = async (
    date: string,
    slot: MealSlot,
    title: string
  ): Promise<void> => {
    const supabase = createClient();
    // Place new extras at the end of the day
    const dayMaxPos =
      meals
        .filter((m) => m.date === date)
        .reduce((max, m) => Math.max(max, m.position), -1) + 1;

    await supabase.from("meals").insert({
      trip_id: tripId,
      date,
      slot,
      title,
      position: Math.max(dayMaxPos, 100),
      participant_ids: [],
      dishes: [],
    });
    await fetchMeals();
  };

  const deleteMeal = async (id: string): Promise<void> => {
    const supabase = createClient();
    await supabase.from("meals").delete().eq("id", id);
    await fetchMeals();
  };

  /** Convenience helper to create a Dish with a fresh ID. */
  const newDish = (name = "", ingredients: string[] = []): Dish => ({
    id: uuidv4(),
    name,
    ingredients,
  });

  return {
    meals,
    loading,
    refetch: fetchMeals,
    updateMeal,
    addExtraMeal,
    deleteMeal,
    newDish,
  };
}
