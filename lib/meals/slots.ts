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
  /** Tailwind bg class for the pill badge. */
  bgClass: string;
}

/** Available slots that can be added to a day. The order also drives sort. */
export const DEFAULT_SLOTS: SlotConfig[] = [
  {
    slot: "breakfast",
    shortLabel: "Matin",
    position: 0,
    emoji: "🥐",
    stripClass: "bg-amber-500",
    textClass: "text-amber-400",
    bgClass: "bg-amber-400/10",
  },
  {
    slot: "lunch",
    shortLabel: "Midi",
    position: 1,
    emoji: "🍝",
    stripClass: "bg-sky-500",
    textClass: "text-sky-400",
    bgClass: "bg-sky-400/10",
  },
  {
    slot: "snack",
    shortLabel: "Goûter",
    position: 2,
    emoji: "🍪",
    stripClass: "bg-pink-500",
    textClass: "text-pink-400",
    bgClass: "bg-pink-400/10",
  },
  {
    slot: "dinner",
    shortLabel: "Soir",
    position: 3,
    emoji: "🍽️",
    stripClass: "bg-violet-500",
    textClass: "text-violet-400",
    bgClass: "bg-violet-400/10",
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
