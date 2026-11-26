import type { QuickAddKind } from "@/hooks/useQuickAdd";
import type { TripModule } from "@/types";

const SECTIONS: { path: string; kind: QuickAddKind; module: TripModule | null }[] = [
  { path: "budget", kind: "expense", module: null },
  { path: "planning", kind: "step", module: "planning" },
  { path: "menus", kind: "meal", module: "menus" },
  { path: "lists", kind: "item", module: "lists" },
];

/** L'ajout évident de l'écran où l'on se trouve (Budget : une dépense, Planning : une étape...). null = accueil. */
export function contextKind(pathname: string, base: string, modules: readonly TripModule[]): QuickAddKind | null {
  for (const s of SECTIONS) {
    const root = `${base}/${s.path}`;
    if (pathname === root || pathname.startsWith(`${root}/`)) {
      return s.module && !modules.includes(s.module) ? null : s.kind;
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
  planning: "Ajouter au planning",
  meal: "Ajouter un repas",
  item: "Ajouter à la liste",
};
