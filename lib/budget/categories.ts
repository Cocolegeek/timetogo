import {
  ShoppingCart,
  UtensilsCrossed,
  Sparkles,
  Car,
  Bed,
  Package,
  ArrowLeftRight,
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
    color: "text-foreground",
    bg: "bg-secondary",
    ring: "ring-foreground/30",
  },
  restaurant: {
    label: "Restaurant",
    icon: UtensilsCrossed,
    color: "text-foreground",
    bg: "bg-secondary",
    ring: "ring-foreground/30",
  },
  activities: {
    label: "Activités",
    icon: Sparkles,
    color: "text-foreground",
    bg: "bg-secondary",
    ring: "ring-foreground/30",
  },
  transport: {
    label: "Transport",
    icon: Car,
    color: "text-foreground",
    bg: "bg-secondary",
    ring: "ring-foreground/30",
  },
  accommodation: {
    label: "Logement",
    icon: Bed,
    color: "text-foreground",
    bg: "bg-secondary",
    ring: "ring-foreground/30",
  },
  other: {
    label: "Autres",
    icon: Package,
    color: "text-foreground",
    bg: "bg-secondary",
    ring: "ring-foreground/30",
  },
  reimbursement: {
    label: "Remboursement",
    icon: ArrowLeftRight,
    color: "text-foreground",
    bg: "bg-secondary",
    ring: "ring-foreground/30",
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
