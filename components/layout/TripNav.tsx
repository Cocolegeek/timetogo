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
          className="glass-strong rounded-[1.75rem] px-2.5 py-2.5"
          style={{
            boxShadow:
              "0 24px 60px -16px rgba(0,0,0,0.45), 0 0 0 1px var(--glass-border-strong) inset",
          }}
        >
          <div className="flex items-stretch justify-around gap-1">
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
                    "flex-1 flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-2xl transition-all relative active:scale-95 min-w-0",
                    isActive
                      ? "text-slate-100"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full transition-all duration-200 shrink-0",
                      isActive ? "w-12 h-12" : "w-11 h-11"
                    )}
                    style={
                      isActive
                        ? {
                            background:
                              "linear-gradient(135deg, var(--accent-500), oklch(0.50 calc(var(--accent-c) + 0.03) calc(var(--accent-h) + 25)))",
                            boxShadow:
                              "0 12px 28px -8px var(--accent-glow), inset 0 1px 0 0 oklch(1 0 0 / 22%)",
                          }
                        : undefined
                    }
                  >
                    <Icon
                      size={isActive ? 24 : 23}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={isActive ? "text-white" : ""}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[12px] sm:text-[13px] leading-none tracking-tight truncate max-w-full px-0.5 transition-all",
                      isActive ? "font-bold" : "font-medium"
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
