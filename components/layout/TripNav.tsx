"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, Map, UtensilsCrossed, Home, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { featuresForType } from "@/lib/trip-features";
import type { TripType } from "@/types";

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Full path to navigate to, given the trip base path. */
  to: (base: string) => string;
  /** Whether this item should appear active for the current pathname. */
  isActive: (path: string, base: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: "home",
    label: "Accueil",
    icon: Home,
    to: () => "/trips",
    // Home never highlights inside a trip — by definition, on /trips
    // the trip layout (and this nav) is no longer mounted.
    isActive: () => false,
  },
  {
    id: "budget",
    label: "Budget",
    icon: Wallet,
    to: (base) => `${base}/budget`,
    isActive: (path, base) => path.startsWith(`${base}/budget`),
  },
  {
    id: "planning",
    label: "Planning",
    icon: Map,
    to: (base) => `${base}/planning`,
    isActive: (path, base) => path.startsWith(`${base}/planning`),
  },
  {
    id: "menus",
    label: "Menus",
    icon: UtensilsCrossed,
    to: (base) => `${base}/menus`,
    isActive: (path, base) => path.startsWith(`${base}/menus`),
  },
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
    if (item.id === "planning") return features.hasPlanning;
    if (item.id === "menus") return features.hasMenus;
    return true;
  });

  return (
    <nav
      className="fixed z-40 inset-x-3 sm:inset-x-6"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <div className="max-w-3xl mx-auto">
        <div
          className="glass-strong rounded-3xl px-2 py-2 shadow-2xl"
          style={{
            boxShadow:
              "0 24px 60px -16px rgba(0,0,0,0.45), 0 0 0 1px var(--glass-border-strong) inset",
          }}
        >
          <div className="flex items-center justify-around gap-1">
            {items.map(({ id, label, icon: Icon, to, isActive }) => {
              const active = isActive(pathname, base);

              return (
                <Link
                  key={id}
                  href={to(base)}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-2xl transition-all relative active:scale-95",
                    active
                      ? "text-slate-100"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full transition-all duration-200",
                      active ? "w-11 h-11" : "w-10 h-10"
                    )}
                    style={
                      active
                        ? {
                            background:
                              "linear-gradient(135deg, var(--accent-500), oklch(0.50 calc(var(--accent-c) + 0.03) calc(var(--accent-h) + 25)))",
                            boxShadow:
                              "0 10px 24px -6px var(--accent-glow), inset 0 1px 0 0 oklch(1 0 0 / 20%)",
                          }
                        : undefined
                    }
                  >
                    <Icon
                      size={22}
                      strokeWidth={active ? 2.5 : 2}
                      className={active ? "text-white" : ""}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[11px] leading-none tracking-tight transition-all",
                      active ? "font-semibold" : "font-medium"
                    )}
                    style={active ? { color: "var(--accent-300)" } : undefined}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
