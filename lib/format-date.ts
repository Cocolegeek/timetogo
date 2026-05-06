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

/** Days from now until the start date. Negative if past. */
export function daysUntil(startISO: string): number {
  const s = new Date(startISO);
  const now = new Date();
  // Strip time
  s.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((s.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
