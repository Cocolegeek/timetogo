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
                    "flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-2xl transition-all relative active:scale-95",
                    isActive
                      ? "text-slate-100"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full transition-all duration-200",
                      isActive
                        ? "w-11 h-11"
                        : "w-10 h-10"
                    )}
                    style={
                      isActive
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
                      size={isActive ? 22 : 22}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={isActive ? "text-white" : ""}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[11px] leading-none tracking-tight transition-all",
                      isActive ? "font-semibold" : "font-medium"
                    )}
                    style={isActive ? { color: "var(--accent-300)" } : undefined}
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
