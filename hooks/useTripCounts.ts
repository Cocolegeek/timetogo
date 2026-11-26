"use client";

import { useBudget } from "@/hooks/useBudget";
import { useItinerary } from "@/hooks/useItinerary";
import { useMeals } from "@/hooks/useMeals";
import { useChecklist } from "@/hooks/useChecklist";

/** Combien d'éléments dans chaque espace du voyage (lecture du cache SWR partagé, aucune requête de plus). */
export function useTripCounts(tripId: string) {
  const { expenses } = useBudget(tripId);
  const { items: steps } = useItinerary(tripId);
  const { meals } = useMeals(tripId);
  const { items: lists } = useChecklist(tripId);
  return {
    expenses: expenses.length,
    planning: steps.length,
    menus: meals.length,
    lists: lists.length,
  };
}
