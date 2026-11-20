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
    label: "À la maison",
    badgeClass: "bg-foreground/[0.07] text-muted-foreground",
    stripClass: "bg-slate-500",
  },
  picnic: {
    category: "picnic",
    label: "Pique-nique",
    badgeClass: "bg-emerald-500/12 text-emerald-400",
    stripClass: "bg-emerald-500",
  },
  restaurant: {
    category: "restaurant",
    label: "Resto",
    badgeClass: "bg-rose-500/12 text-rose-400",
    stripClass: "bg-red-500",
  },
};

export const CATEGORY_ORDER: MealCategory[] = ["home", "picnic", "restaurant"];
