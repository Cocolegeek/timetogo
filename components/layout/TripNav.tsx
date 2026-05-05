"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wallet, Map, CheckSquare, LayoutDashboard, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Résumé",    href: "",           icon: LayoutDashboard },
  { label: "Budget",    href: "/budget",    icon: Wallet          },
  { label: "Planning",  href: "/planning",  icon: Map             },
  { label: "Checklist", href: "/checklist", icon: CheckSquare     },
];

interface TripNavProps {
  tripId: string;
}

export function TripNav({ tripId }: TripNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/trips/${tripId}`;
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    router.refresh();
    // Brief visual feedback before re-enabling
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <nav className="sticky top-0 z-40 glass-strong border-b border-white/8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center">
          <div className="flex flex-1">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
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
                    "flex items-center gap-1.5 px-3 py-3.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px",
                    isActive
                      ? "border-indigo-400 text-indigo-300"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  )}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Actualiser"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-all ml-1"
          >
            <RefreshCw
              size={14}
              className={cn("transition-transform", refreshing && "animate-spin")}
            />
          </button>
        </div>
      </div>
    </nav>
  );
}
