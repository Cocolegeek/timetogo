import type { MealCategory } from "@/types";

export interface CategoryConfig {
  category: MealCategory;
  label: string;
  /** Tailwind classes for the colored pill badge. */
  badgeClass: string;
  /** Tailwind class for the colored left-strip on the meal card. */
  stripClass: string;
}

/** Visual identity for each meal category. */
export const CATEGORY_CONFIG: Record<MealCategory, CategoryConfig> = {
  home: {
    category: "home",
    label: "À Table",
    badgeClass:
      "bg-slate-500/20 text-slate-200 border border-slate-500/40",
    stripClass: "bg-slate-500",
  },
  picnic: {
    category: "picnic",
    label: "Pique-nique",
    badgeClass:
      "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
    stripClass: "bg-emerald-500",
  },
  restaurant: {
    category: "restaurant",
    label: "Resto",
    badgeClass: "bg-red-500/20 text-red-300 border border-red-500/40",
    stripClass: "bg-red-500",
  },
};

export const CATEGORY_ORDER: MealCategory[] = ["home", "picnic", "restaurant"];
