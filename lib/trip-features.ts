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
  { id: "planning", label: "Planning", hint: "Les étapes et les trajets, jour par jour.", needsDates: true },
  { id: "menus", label: "Menus", hint: "Ce qu'on cuisine et ce qu'on achète.", needsDates: true },
  { id: "lists", label: "Listes", hint: "Qui apporte quoi, qui fait quoi.", needsDates: false },
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

export function tripFeatures(trip: Pick<Trip, "modules">): TripFeatures {
  return featuresForModules(trip.modules);
}

/** Planning et menus ont besoin de jours : il faut un début et une fin. */
export function hasPeriod(trip: Pick<Trip, "startDate" | "endDate">): boolean {
  return !!trip.startDate && !!trip.endDate;
}

/** Sans planning ni menus, le Résumé n'a rien de plus à montrer que le budget : on ouvre le budget directement. */
export function tripHref(trip: Pick<Trip, "id" | "modules">): string {
  const rich = trip.modules.includes("planning") || trip.modules.includes("menus");
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
