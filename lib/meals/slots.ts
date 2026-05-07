import type { MealSlot } from "@/types";

export interface SlotConfig {
  slot: MealSlot;
  /** Compact label shown on cards (uppercase). */
  shortLabel: string;
  position: number;
  emoji: string;
  /** Tailwind class for the colored left-strip when the meal is filled. */
  stripClass: string;
  /** Tailwind text-color class matching the strip (used on badges/etc.). */
  textClass: string;
}

/** Three fixed slots auto-generated for every day of a trip. */
export const DEFAULT_SLOTS: SlotConfig[] = [
  {
    slot: "breakfast",
    shortLabel: "MATIN",
    position: 0,
    emoji: "🥐",
    stripClass: "bg-amber-500",
    textClass: "text-amber-300",
  },
  {
    slot: "lunch",
    shortLabel: "MIDI",
    position: 1,
    emoji: "🍝",
    stripClass: "bg-sky-500",
    textClass: "text-sky-300",
  },
  {
    slot: "dinner",
    shortLabel: "SOIR",
    position: 2,
    emoji: "🍽️",
    stripClass: "bg-violet-500",
    textClass: "text-violet-300",
  },
];

export const SLOT_CONFIG: Record<MealSlot, SlotConfig> = Object.fromEntries(
  DEFAULT_SLOTS.map((s) => [s.slot, s])
) as Record<MealSlot, SlotConfig>;

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

/**
 * Build the rows (snake_case for Supabase) to insert in `meals` for a fresh trip.
 * Titles are intentionally left blank so the UI shows "non renseigné" until
 * the user actually names the meal.
 */
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
    category: "home";
    position: number;
    participant_ids: string[];
    cook_ids: string[];
    ingredients: never[];
  }> = [];

  for (const date of eachDate(startDate, endDate)) {
    for (const slot of DEFAULT_SLOTS) {
      rows.push({
        trip_id: tripId,
        date,
        slot: slot.slot,
        title: "",
        category: "home",
        position: slot.position,
        participant_ids: [],
        cook_ids: [],
        ingredients: [],
      });
    }
  }

  return rows;
}
