import {
  ShoppingCart,
  UtensilsCrossed,
  Sparkles,
  Car,
  Bed,
  Package,
  type LucideIcon,
} from "lucide-react";
import type { ExpenseCategory } from "@/types";

export interface CategoryConfig {
  label: string;
  icon: LucideIcon;
  /** Tailwind text color */
  color: string;
  /** Tailwind background color (semi-transparent) */
  bg: string;
  /** Tailwind ring color (used for selected state) */
  ring: string;
}

export const CATEGORIES: Record<ExpenseCategory, CategoryConfig> = {
  courses: {
    label: "Courses",
    icon: ShoppingCart,
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    ring: "ring-amber-500/40",
  },
  restaurant: {
    label: "Restaurant",
    icon: UtensilsCrossed,
    color: "text-rose-400",
    bg: "bg-rose-500/15",
    ring: "ring-rose-500/40",
  },
  activities: {
    label: "Activités",
    icon: Sparkles,
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    ring: "ring-emerald-500/40",
  },
  transport: {
    label: "Transport",
    icon: Car,
    color: "text-sky-400",
    bg: "bg-sky-500/15",
    ring: "ring-sky-500/40",
  },
  accommodation: {
    label: "Logement",
    icon: Bed,
    color: "text-violet-400",
    bg: "bg-violet-500/15",
    ring: "ring-violet-500/40",
  },
  other: {
    label: "Autres",
    icon: Package,
    color: "text-slate-400",
    bg: "bg-slate-500/15",
    ring: "ring-slate-500/40",
  },
};

export const CATEGORY_ORDER: ExpenseCategory[] = [
  "courses",
  "restaurant",
  "activities",
  "transport",
  "accommodation",
  "other",
];
