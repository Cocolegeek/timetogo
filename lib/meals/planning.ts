import { SLOT_CONFIG } from "./slots.ts";
import type { Meal, MealSlot } from "@/types";

/** Heure et durée proposées dans le planning pour chaque repas : modifiables ensuite depuis l'onglet Planning. */
export const SLOT_DEFAULTS: Record<MealSlot, { time: string; durationMinutes: number }> = {
  breakfast: { time: "08:00", durationMinutes: 60 },
  lunch: { time: "12:00", durationMinutes: 60 },
  snack: { time: "16:00", durationMinutes: 30 },
  dinner: { time: "20:00", durationMinutes: 60 },
};

export interface MealPlanningEntry {
  title: string;
  description?: string;
  time: string;
  durationMinutes: number;
  participantIds: string[];
}

/** Réglage « repas dans le planning » éteint : on cache les étapes nées d'un repas (elles restent en base). */
export function visibleSteps<T extends { mealId?: string }>(steps: readonly T[], mealsInPlanning: boolean): T[] {
  return mealsInPlanning ? [...steps] : steps.filter((s) => !s.mealId);
}

type MealLike = Pick<Meal, "slot" | "category" | "title" | "notes" | "dishes" | "participantIds" | "link">;

function dishSummary(dishes: Meal["dishes"]): string {
  const names = dishes.map((d) => d.name.trim()).filter(Boolean);
  if (names.length === 0) return "";
  return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
}

/** L'étape du planning qui correspond à un repas : « Déjeuner · Chez Léa », 12:00, une heure. */
export function mealPlanningEntry(meal: MealLike): MealPlanningEntry {
  const label = SLOT_CONFIG[meal.slot].label;
  const note = meal.title?.trim() ?? "";
  const detail = meal.category === "picnic" ? "Pique-nique" : dishSummary(meal.dishes) || note;
  const lines = [meal.category === "picnic" ? meal.link?.trim() : "", meal.notes?.trim()].filter(Boolean);
  const defaults = SLOT_DEFAULTS[meal.slot];
  return {
    title: detail ? `${label} · ${detail}` : label,
    description: lines.length > 0 ? lines.join("\n") : undefined,
    time: defaults.time,
    durationMinutes: defaults.durationMinutes,
    participantIds: meal.participantIds,
  };
}
