/**
 * Format a date range in a compact, French-natural way:
 * - "5–12 mai"            (same month)
 * - "28 avr. – 3 mai"     (cross-month, same year)
 * - "28 déc. 2025 – 3 janv. 2026" (cross-year)
 */
export function formatDateRange(startISO: string, endISO: string): string {
  const s = new Date(startISO);
  const e = new Date(endISO);

  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "";

  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();

  if (sameMonth) {
    const month = e.toLocaleDateString("fr-FR", { month: "short" });
    return `${s.getDate()}–${e.getDate()} ${month}`;
  }

  if (sameYear) {
    return `${s.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    })} – ${e.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;
  }

  return `${s.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} – ${e.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

/** Trip duration in days (inclusive). */
export function tripDuration(startISO: string, endISO: string): number {
  const s = new Date(startISO);
  const e = new Date(endISO);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return Math.max(
    1,
    Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  );
}

/** Format a duration (in minutes) into a compact French label: "30 min", "1 h", "1 h 30". */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h} h ${m.toString().padStart(2, "0")}`;
  if (h > 0) return `${h} h`;
  return `${m} min`;
}

/** Days from now until the start date. Negative if past. */
export function daysUntil(startISO: string): number {
  const s = new Date(startISO);
  const now = new Date();
  // Strip time
  s.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((s.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
