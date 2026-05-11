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
      className="fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-foreground/8"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-3xl mx-auto px-2">
        <div className="flex">
          {items.map(({ label, href, icon: Icon }) => {
            const fullHref = `${base}${href}`;
            const isActive =
              href === ""
                ? pathname === base
                : pathname.startsWith(fullHref);

            return (
              <Link
                key={href}
                href={fullHref}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1.5 py-3 transition-all relative active:scale-95",
                  isActive
                    ? "text-indigo-400"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-indigo-400 rounded-b-full" />
                )}
                <Icon size={26} strokeWidth={isActive ? 2.4 : 2} />
                <span
                  className={cn(
                    "text-[13px] leading-none tracking-tight transition-all",
                    isActive ? "font-semibold" : "font-medium"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
