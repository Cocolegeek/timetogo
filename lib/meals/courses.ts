import { CakeSlice, Salad, Utensils, Wine, Soup, type LucideIcon } from "lucide-react";
import type { DishCourse } from "@/types";

export const COURSES: { id: DishCourse; label: string; icon: LucideIcon }[] = [
  { id: "starter", label: "Entrée", icon: Salad },
  { id: "main", label: "Plat", icon: Utensils },
  { id: "cheese", label: "Fromage", icon: Wine },
  { id: "dessert", label: "Dessert", icon: CakeSlice },
  { id: "other", label: "Autre", icon: Soup },
];

export const COURSE_BY_ID = Object.fromEntries(COURSES.map((c) => [c.id, c])) as Record<
  DishCourse,
  (typeof COURSES)[number]
>;

export const COURSE_ORDER: DishCourse[] = ["starter", "main", "cheese", "dessert", "other"];
