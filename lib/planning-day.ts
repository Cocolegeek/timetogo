import type { ItineraryItem } from "@/types";

export interface RelevantDay {
  /** ISO date YYYY-MM-DD */
  date: string;
  /** 0 = today, +N = future, -N = past */
  daysOffset: number;
  /** Items for this day, sorted by time. */
  items: ItineraryItem[];
}

/**
 * Pick the most relevant day to display:
 *  1. Today, if today has events.
 *  2. Otherwise, the next future day with events.
 *  3. Otherwise, the most recent past day with events.
 *  4. Otherwise, null.
 */
export function pickRelevantPlanningDay(
  items: ItineraryItem[],
  todayISO: string
): RelevantDay | null {
  if (!items || items.length === 0) return null;

  const byDate: Record<string, ItineraryItem[]> = {};
  for (const item of items) {
    if (!byDate[item.date]) byDate[item.date] = [];
    byDate[item.date].push(item);
  }

  const dates = Object.keys(byDate).sort();
  const sortByTime = (arr: ItineraryItem[]) =>
    [...arr].sort((a, b) => (a.time ?? "00:00").localeCompare(b.time ?? "00:00"));

  if (byDate[todayISO]) {
    return { date: todayISO, daysOffset: 0, items: sortByTime(byDate[todayISO]) };
  }

  const future = dates.find((d) => d > todayISO);
  if (future) {
    return {
      date: future,
      daysOffset: dayDiff(future, todayISO),
      items: sortByTime(byDate[future]),
    };
  }

  const past = [...dates].reverse().find((d) => d < todayISO);
  if (past) {
    return {
      date: past,
      daysOffset: dayDiff(past, todayISO),
      items: sortByTime(byDate[past]),
    };
  }

  return null;
}

function dayDiff(targetISO: string, fromISO: string): number {
  return Math.round(
    (new Date(targetISO).getTime() - new Date(fromISO).getTime()) / 86400000
  );
}

/** Friendly label like "Aujourd'hui", "Demain", "Dans 3 jours", "Il y a 5 jours". */
export function relativeDayLabel(daysOffset: number): string {
  if (daysOffset === 0) return "Aujourd'hui";
  if (daysOffset === 1) return "Demain";
  if (daysOffset === -1) return "Hier";
  if (daysOffset > 0) return `Dans ${daysOffset} jours`;
  return `Il y a ${Math.abs(daysOffset)} jours`;
}
