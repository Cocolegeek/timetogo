import type { QuickAddKind } from "@/hooks/useQuickAdd";
import type { TripType } from "@/types";

const SECTIONS: { path: string; kind: QuickAddKind; voyageOnly: boolean }[] = [
  { path: "budget", kind: "expense", voyageOnly: false },
  { path: "planning", kind: "step", voyageOnly: true },
  { path: "menus", kind: "meal", voyageOnly: true },
  { path: "lists", kind: "item", voyageOnly: false },
];

/** L'ajout évident de l'écran où l'on se trouve (Budget : une dépense, Planning : une étape...). null = accueil. */
export function contextKind(pathname: string, base: string, tripType: TripType): QuickAddKind | null {
  for (const s of SECTIONS) {
    const root = `${base}/${s.path}`;
    if (pathname === root || pathname.startsWith(`${root}/`)) {
      return s.voyageOnly && tripType !== "trip" ? null : s.kind;
    }
  }
  return null;
}

/** Le choix proposé en premier : l'action de l'écran, sinon la dépense (l'ajout le plus fréquent). */
export function leadKind(context: QuickAddKind | null, available: QuickAddKind[]): QuickAddKind | null {
  const wanted = context ?? "expense";
  return available.includes(wanted) ? wanted : (available[0] ?? null);
}

/** Met l'action principale en tête, sans toucher à l'ordre des autres. */
export function orderActions<T extends { kind: QuickAddKind }>(actions: T[], lead: QuickAddKind | null): T[] {
  if (!lead) return actions;
  return [...actions.filter((a) => a.kind === lead), ...actions.filter((a) => a.kind !== lead)];
}

export const ADD_LABELS: Record<QuickAddKind, string> = {
  expense: "Ajouter une dépense",
  step: "Ajouter une étape",
  journey: "Ajouter un trajet",
  meal: "Ajouter un repas",
  item: "Ajouter à la liste",
};
