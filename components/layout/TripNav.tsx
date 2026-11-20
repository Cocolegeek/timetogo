"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, Map, UtensilsCrossed, LayoutDashboard, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { featuresForType } from "@/lib/trip-features";
import type { TripType } from "@/types";

type NavItem = { label: string; href: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { label: "Résumé",   href: "",          icon: LayoutDashboard  },
  { label: "Budget",   href: "/budget",   icon: Wallet           },
  { label: "Planning", href: "/planning", icon: Map              },
  { label: "Menus",    href: "/menus",    icon: UtensilsCrossed  },
];

interface TripNavProps {
  tripId: string;
  tripType: TripType;
}

export function TripNav({ tripId, tripType }: TripNavProps) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;
  const features = featuresForType(tripType);

  const items = NAV_ITEMS.filter((item) => {
    if (item.href === "/planning") return features.hasPlanning;
    if (item.href === "/menus") return features.hasMenus;
    return true;
  });

  return (
    <nav
      aria-label="Navigation du voyage"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-3xl mx-auto h-[4.75rem] flex items-center justify-around px-3">
        {items.map(({ label, href, icon: Icon }) => {
          const fullHref = `${base}${href}`;
          const isActive =
            href === "" ? pathname === base : pathname.startsWith(fullHref);

          return (
            <Link
              key={href}
              href={fullHref}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs transition-colors active:scale-95",
                isActive
                  ? "font-semibold text-foreground"
                  : "font-medium text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                size={24}
                strokeWidth={isActive ? 2.2 : 2}
                className={isActive ? "text-primary" : undefined}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
