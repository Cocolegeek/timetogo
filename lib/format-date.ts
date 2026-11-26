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

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** « Aujourd'hui », « Demain », « Hier », sinon « Mer. 26 nov. » : la date telle qu'on la dit. */
export function friendlyDay(iso: string, today: Date = new Date()): string {
  if (!iso) return "";
  const day = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(day.getTime())) return iso;
  const shift = (n: number) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + n);
    return localISO(d);
  };
  if (iso === shift(0)) return "Aujourd'hui";
  if (iso === shift(1)) return "Demain";
  if (iso === shift(-1)) return "Hier";
  const label = day.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** « 14:32 » dans l'heure locale, vide si la date est invalide. */
export function formatClock(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** « 26 nov. à 14:32 » (l'année seulement si ce n'est pas l'année en cours). */
export function formatAddedAt(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  });
  return `${day} à ${formatClock(iso)}`;
}
