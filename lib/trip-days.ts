const ymd = /^\d{4}-\d{2}-\d{2}$/;

function eachDay(start: string, end: string): string[] {
  if (!ymd.test(start) || !ymd.test(end) || end < start) return [];
  const out: string[] = [];
  const [sy, sm, sd] = start.split("-").map(Number);
  const cursor = new Date(Date.UTC(sy, sm - 1, sd));
  const last = end;
  for (let i = 0; i < 400; i++) {
    const day = cursor.toISOString().slice(0, 10);
    if (day > last) break;
    out.push(day);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/**
 * Les jours à montrer dans Planning et Menus : ceux de la période si elle existe, plus tout jour qui contient déjà
 * quelque chose. Sans période : les jours remplis, ou aujourd'hui quand il n'y a encore rien (on peut toujours ajouter).
 */
export function tripDays(period: { startDate?: string; endDate?: string }, filledDates: readonly string[], today: string): string[] {
  const set = new Set<string>(filledDates.filter((d) => ymd.test(d)));
  if (period.startDate && period.endDate) for (const d of eachDay(period.startDate, period.endDate)) set.add(d);
  if (set.size === 0) set.add(today);
  return [...set].sort();
}
