import type { TripFeatures } from "@/lib/trip-features";

export type SectionHref = "" | "/budget" | "/planning" | "/menus" | "/lists";

export interface SectionCounts {
  planning: number;
  menus: number;
  lists: number;
}

export const SEARCH_MIN_ITEMS = 5;

/**
 * Résumé et Budget toujours. Un autre onglet est là si l'espace est coché OU s'il contient déjà quelque chose
 * (`features` vient de `featuresWithContent`), et il ne disparaît jamais quand on y est.
 */
export function visibleSections(
  features: Pick<TripFeatures, "hasPlanning" | "hasMenus" | "hasLists">,
  active: SectionHref | null
): SectionHref[] {
  const out: SectionHref[] = ["", "/budget"];
  if (features.hasPlanning || active === "/planning") out.push("/planning");
  if (features.hasMenus || active === "/menus") out.push("/menus");
  if (features.hasLists || active === "/lists") out.push("/lists");
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
