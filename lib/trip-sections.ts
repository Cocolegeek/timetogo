export type SectionHref = "" | "/budget" | "/planning" | "/menus" | "/lists";

export interface SectionCounts {
  planning: number;
  menus: number;
  lists: number;
}

export const SEARCH_MIN_ITEMS = 5;

/** Résumé et Budget toujours ; les autres onglets dès qu'ils contiennent quelque chose, ou quand on y est (cochés ou non). */
export function visibleSections(counts: SectionCounts, active: SectionHref | null): SectionHref[] {
  const out: SectionHref[] = ["", "/budget"];
  if (counts.planning > 0 || active === "/planning") out.push("/planning");
  if (counts.menus > 0 || active === "/menus") out.push("/menus");
  if (counts.lists > 0 || active === "/lists") out.push("/lists");
  return out;
}

export function sectionOf(pathname: string, base: string): SectionHref | null {
  if (pathname === base) return "";
  for (const href of ["/budget", "/planning", "/menus", "/lists"] as const) {
    if (pathname.startsWith(`${base}${href}`)) return href;
  }
  return null;
}

/** Le Résumé s'étale sur deux colonnes sur grand écran ; les autres pages restent en colonne de lecture. */
export function contentWidth(pathname: string, base: string): "wide" | "narrow" {
  return pathname === base ? "wide" : "narrow";
}

export function canSearch(totalItems: number): boolean {
  return totalItems >= SEARCH_MIN_ITEMS;
}
