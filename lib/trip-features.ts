import type { Trip, TripModule } from "@/types";

/**
 * Source de vérité des espaces d'un voyage. Le budget est toujours là ; Planning, Menus et Listes
 * se choisissent à la création et dans les réglages du voyage (colonne `modules`).
 */
export interface TripFeatures {
  hasPlanning: boolean;
  hasMenus: boolean;
  /** Listes « À apporter » / « À faire » (migration 022). */
  hasLists: boolean;
  /** Dépenses répétées (loyer, abonnements) : pour les budgets sans planning. */
  hasRecurring: boolean;
}

export const TRIP_MODULES: { id: TripModule; label: string; hint: string; needsDates: boolean }[] = [
  { id: "planning", label: "Planning", hint: "Étapes et trajets, jour par jour", needsDates: true },
  { id: "menus", label: "Menus", hint: "Ce qu'on cuisine ou achète", needsDates: true },
  { id: "lists", label: "Listes", hint: "Qui apporte quoi, qui fait quoi", needsDates: false },
];

export const ALL_MODULES: TripModule[] = TRIP_MODULES.map((m) => m.id);

export function featuresForModules(modules: readonly TripModule[]): TripFeatures {
  const has = (m: TripModule) => modules.includes(m);
  return {
    hasPlanning: has("planning"),
    hasMenus: has("menus"),
    hasLists: has("lists"),
    hasRecurring: !has("planning"),
  };
}

/** Les espaces d'un voyage. Tolère un voyage gardé en cache avant l'arrivée des espaces (champ absent). */
export function modulesOf(trip: { modules?: readonly TripModule[] | null }): readonly TripModule[] {
  return Array.isArray(trip.modules) ? trip.modules : modulesFromLegacyType(undefined);
}

export function tripFeatures(trip: { modules?: readonly TripModule[] | null }): TripFeatures {
  return featuresForModules(modulesOf(trip));
}

/** Planning et menus ont besoin de jours : il faut un début et une fin. */
export function hasPeriod(trip: Pick<Trip, "startDate" | "endDate">): boolean {
  return !!trip.startDate && !!trip.endDate;
}

/** Sans planning ni menus, le Résumé n'a rien de plus à montrer que le budget : on ouvre le budget directement. */
export function tripHref(trip: { id: string; modules?: readonly TripModule[] | null }): string {
  const modules = modulesOf(trip);
  const rich = modules.includes("planning") || modules.includes("menus");
  return rich ? `/trips/${trip.id}` : `/trips/${trip.id}/budget`;
}

/** Ancienne base (colonne `modules` absente) : on retrouve les espaces d'après l'ancien type. */
export function modulesFromLegacyType(type: string | null | undefined): TripModule[] {
  return type === "group" ? ["lists"] : ["planning", "menus", "lists"];
}

export function parseModules(value: unknown, legacyType?: string | null): TripModule[] {
  if (!Array.isArray(value)) return modulesFromLegacyType(legacyType);
  return ALL_MODULES.filter((m) => value.includes(m));
}
