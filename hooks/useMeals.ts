"use client";

import { createClient } from "@/lib/supabase/client";
import { DEFAULT_SLOTS } from "@/lib/meals/slots";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import type { Dish, Meal, MealCategory, MealSlot } from "@/types";

function rowToMeal(row: Record<string, unknown>): Meal {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    date: row.date as string,
    slot: row.slot as MealSlot,
    category: ((row.category as string) ?? "home") as MealCategory,
    title: (row.title as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    link: (row.link as string | null) ?? null,
    participantIds: Array.isArray(row.participant_ids) ? (row.participant_ids as string[]) : [],
    cookIds: Array.isArray(row.cook_ids) ? (row.cook_ids as string[]) : [],
    dishes: Array.isArray(row.dishes) ? (row.dishes as Dish[]) : [],
    position: (row.position as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

const NO_MEALS: Meal[] = [];

export async function fetchMealRows(tripId: string): Promise<Meal[]> {
  const { data } = await createClient()
    .from("meals")
    .select("*")
    .eq("trip_id", tripId)
    .order("date")
    .order("position");
  return (data ?? []).map(rowToMeal);
}

export function useMeals(tripId: string) {
  const { data: meals, loading, set: setMeals, refetch: fetchMeals } = useCachedQuery(
    tripId ? `meals:${tripId}` : null,
    () => fetchMealRows(tripId),
    NO_MEALS
  );

  const updateMeal = async (
    id: string,
    data: Partial<Pick<Meal, "title" | "category" | "notes" | "link" | "participantIds" | "cookIds" | "dishes">>
  ): Promise<void> => {
    const snapshot = meals;
    setMeals((ms) => ms.map((m) => (m.id === id ? { ...m, ...data } : m)));

    const { error } = await createClient().from("meals").update({
      ...(data.title !== undefined && { title: data.title ?? null }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.notes !== undefined && { notes: data.notes ?? null }),
      ...(data.link !== undefined && { link: data.link ?? null }),
      ...(data.participantIds !== undefined && { participant_ids: data.participantIds }),
      ...(data.cookIds !== undefined && { cook_ids: data.cookIds }),
      ...(data.dishes !== undefined && { dishes: data.dishes }),
    }).eq("id", id);

    if (error) { setMeals(snapshot); throw new Error(error.message); }
  };

  const addMeal = async (date: string, slot: MealSlot): Promise<Meal> => {
    const position = DEFAULT_SLOTS.find((s) => s.slot === slot)?.position ?? 0;
    const { data, error } = await createClient().from("meals").insert({
      trip_id: tripId,
      date,
      slot,
      title: null,
      category: "home",
      position,
      participant_ids: [],
      cook_ids: [],
      dishes: [],
    }).select().single();
    if (error) throw new Error(error.message);
    const meal = rowToMeal(data as Record<string, unknown>);
    setMeals((ms) =>
      [...ms, meal].sort(
        (a, b) => a.date.localeCompare(b.date) || a.position - b.position
      )
    );
    return meal;
  };

  const deleteMeal = async (id: string): Promise<void> => {
    const snapshot = meals;
    setMeals((ms) => ms.filter((m) => m.id !== id));
    const { error } = await createClient().from("meals").delete().eq("id", id);
    if (error) { setMeals(snapshot); throw new Error(error.message); }
  };

  return { meals, loading, refetch: fetchMeals, addMeal, updateMeal, deleteMeal };
}
