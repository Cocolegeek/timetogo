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
    stripClass: "bg-foreground/25",
  },
  picnic: {
    category: "picnic",
    label: "Pique-nique",
    badgeClass: "bg-foreground/[0.07] text-muted-foreground",
    stripClass: "bg-foreground/25",
  },
  restaurant: {
    category: "restaurant",
    label: "Resto",
    badgeClass: "bg-foreground/[0.07] text-muted-foreground",
    stripClass: "bg-foreground/25",
  },
};

/** Les menus, c'est ce qu'on cuisine ou achète. Un resto est une étape du planning ; « restaurant » reste connu pour d'anciens repas en cache. */
export const CATEGORY_ORDER: MealCategory[] = ["home", "picnic"];
