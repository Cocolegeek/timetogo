import { cn } from "@/lib/utils";
import {
  Plane,
  Hotel,
  UtensilsCrossed,
  Ticket,
  ShoppingBag,
  HeartPulse,
  Circle,
} from "lucide-react";
import type { ExpenseCategory } from "@/types";

const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; Icon: React.ElementType; color: string; bg: string }
> = {
  transport: {
    label: "Transport",
    Icon: Plane,
    color: "text-sky-400",
    bg: "bg-sky-400/10",
  },
  accommodation: {
    label: "Hébergement",
    Icon: Hotel,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  food: {
    label: "Resto & Food",
    Icon: UtensilsCrossed,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  activities: {
    label: "Activités",
    Icon: Ticket,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  shopping: {
    label: "Shopping",
    Icon: ShoppingBag,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
  health: {
    label: "Santé",
    Icon: HeartPulse,
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
  other: {
    label: "Autre",
    Icon: Circle,
    color: "text-slate-400",
    bg: "bg-slate-400/10",
  },
};

interface CategoryPillProps {
  category: ExpenseCategory;
  size?: "sm" | "md";
}

export function CategoryPill({ category, size = "md" }: CategoryPillProps) {
  const { label, Icon, color, bg } = CATEGORY_CONFIG[category];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        bg,
        color,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      )}
    >
      <Icon size={size === "sm" ? 10 : 12} />
      {label}
    </span>
  );
}

export { CATEGORY_CONFIG };
