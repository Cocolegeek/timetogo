import type { RecurrenceFrequency } from "@/types";

/** Prochaine échéance (« YYYY-MM-DD »). Jumeau de next_recurrence() en SQL : le mensuel garde son jour d'ancrage. */
export function nextRecurrence(from: string, frequency: RecurrenceFrequency, anchorDay: number): string {
  const [y, m, d] = from.split("-").map(Number);
  if (frequency === "weekly") {
    return new Date(Date.UTC(y, m - 1, d + 7)).toISOString().slice(0, 10);
  }
  const daysInNext = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(anchorDay, daysInNext))).toISOString().slice(0, 10);
}

export function anchorDayOf(date: string): number {
  return Number(date.split("-")[2]);
}

export const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  weekly: "Chaque semaine",
  monthly: "Chaque mois",
};
