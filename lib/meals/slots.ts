import type { MealSlot } from "@/types";

export interface SlotConfig {
  slot: MealSlot;
  title: string;
  /** Default position (0..4 for default slots, ≥ 100 for extras). */
  position: number;
  emoji: string;
}

/** Default slots auto-generated for every day of a trip (in chronological order). */
export const DEFAULT_SLOTS: SlotConfig[] = [
  { slot: "breakfast", title: "Petit-déjeuner", position: 0, emoji: "🥐" },
  { slot: "lunch", title: "Déjeuner", position: 1, emoji: "🍝" },
  { slot: "snack", title: "Goûter", position: 2, emoji: "🍪" },
  { slot: "dinner", title: "Dîner", position: 3, emoji: "🍽️" },
  { slot: "apero", title: "Apéro", position: 4, emoji: "🍷" },
];

export const SLOT_CONFIG: Record<MealSlot, { title: string; emoji: string }> = {
  breakfast: { title: "Petit-déjeuner", emoji: "🥐" },
  lunch: { title: "Déjeuner", emoji: "🍝" },
  snack: { title: "Goûter", emoji: "🍪" },
  dinner: { title: "Dîner", emoji: "🍽️" },
  apero: { title: "Apéro", emoji: "🍷" },
  extra: { title: "Repas", emoji: "🍴" },
};

/** Iterate every date string (YYYY-MM-DD) between start and end (inclusive). */
export function eachDate(startISO: string, endISO: string): string[] {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const out: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    out.push(cursor.toISOString().split("T")[0]);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Build the rows (snake_case for Supabase) to insert in `meals` for a fresh trip. */
export function buildDefaultMealRows(
  tripId: string,
  startDate: string,
  endDate: string
) {
  const rows: Array<{
    trip_id: string;
    date: string;
    slot: MealSlot;
    title: string;
    position: number;
    participant_ids: string[];
    dishes: never[];
  }> = [];

  for (const date of eachDate(startDate, endDate)) {
    for (const slot of DEFAULT_SLOTS) {
      rows.push({
        trip_id: tripId,
        date,
        slot: slot.slot,
        title: slot.title,
        position: slot.position,
        participant_ids: [],
        dishes: [],
      });
    }
  }

  return rows;
}
