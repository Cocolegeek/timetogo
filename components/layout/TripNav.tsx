"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Wallet, Map, UtensilsCrossed, House, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { featuresForType } from "@/lib/trip-features";
import type { TripType } from "@/types";

type NavItem = { label: string; href: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { label: "Résumé",   href: "",          icon: House            },
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl backdrop-saturate-150"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-[4.5rem] max-w-md items-center justify-around px-2">
        {items.map(({ label, href, icon: Icon }) => {
          const fullHref = `${base}${href}`;
          const isActive = href === "" ? pathname === base : pathname.startsWith(fullHref);

          return (
            <li key={href} className="flex-1">
              <Link
                href={fullHref}
                aria-current={isActive ? "page" : undefined}
                className="group flex flex-col items-center gap-1 py-1.5 outline-none"
              >
                <span className="relative flex h-8 w-14 items-center justify-center">
                  {isActive && (
                    <motion.span
                      layoutId="trip-nav-pill"
                      transition={spring}
                      className="absolute inset-0 rounded-full bg-primary/12 dark:bg-primary/20"
                    />
                  )}
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.3 : 1.9}
                    className={cn(
                      "relative transition-[color,transform] duration-200 group-active:scale-90",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "text-xs transition-colors",
                    isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
