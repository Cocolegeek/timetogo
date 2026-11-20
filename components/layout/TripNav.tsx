"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarPlus,
  House,
  Map,
  Plus,
  Route,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useTrip } from "@/hooks/useTrip";
import { dispatchQuickAdd, type QuickAddKind } from "@/hooks/useQuickAdd";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { featuresForType } from "@/lib/trip-features";
import type { TripType } from "@/types";

type NavItem = { label: string; href: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { label: "Résumé", href: "", icon: House },
  { label: "Budget", href: "/budget", icon: Wallet },
  { label: "Planning", href: "/planning", icon: Map },
  { label: "Menus", href: "/menus", icon: UtensilsCrossed },
];

const QUICK_ADD: {
  kind: QuickAddKind;
  label: string;
  hint: string;
  icon: LucideIcon;
  tile: string;
  href: string;
  voyageOnly: boolean;
}[] = [
  { kind: "expense", label: "Dépense", hint: "Qui a payé quoi", icon: Wallet, tile: "bg-primary text-primary-foreground", href: "/budget", voyageOnly: false },
  { kind: "step", label: "Étape", hint: "Activité, resto, logement", icon: CalendarPlus, tile: "bg-emerald-500 text-white", href: "/planning", voyageOnly: true },
  { kind: "journey", label: "Trajet", hint: "D'un lieu à l'autre", icon: Route, tile: "bg-sky-500 text-white", href: "/planning", voyageOnly: true },
  { kind: "meal", label: "Repas", hint: "Menu, courses, cuisiniers", icon: UtensilsCrossed, tile: "bg-rose-500 text-white", href: "/menus", voyageOnly: true },
];

/** Glass material for the floating navigation layer only (never on content). */
const GLASS =
  "bg-background/70 backdrop-blur-2xl backdrop-saturate-[1.8] ring-1 ring-foreground/[0.07] shadow-float dark:bg-[oklch(0.24_0.006_280/0.72)]";

interface TripNavProps {
  tripId: string;
}

export function TripNav({ tripId }: TripNavProps) {
  // Read from the shared trip cache (seeded by the trips list): no server round-trip.
  const { trip } = useTrip(tripId);
  const tripType: TripType = trip?.type ?? "trip";
  const pathname = usePathname();
  const router = useRouter();
  const base = `/trips/${tripId}`;
  const features = featuresForType(tripType);
  const compact = useScrollDirection() === "down";
  const [addOpen, setAddOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => {
    if (item.href === "/planning") return features.hasPlanning;
    if (item.href === "/menus") return features.hasMenus;
    return true;
  });
  const actions = QUICK_ADD.filter((a) => !a.voyageOnly || tripType === "trip");

  const runAction = (kind: QuickAddKind, href: string) => {
    setAddOpen(false);
    const target = `${base}${href}`;
    if (pathname === target) dispatchQuickAdd(kind);
    else router.push(`${target}?new=${kind}`);
  };

  const onPlus = () => {
    haptic("light");
    if (actions.length === 1) runAction(actions[0].kind, actions[0].href);
    else setAddOpen(true);
  };

  return (
    <>
      <nav
        aria-label="Navigation du voyage"
        className="pointer-events-none fixed inset-x-0 z-40 px-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="mx-auto flex max-w-md items-end gap-2.5">
          <ul className={cn("pointer-events-auto flex flex-1 items-center rounded-full p-1.5", GLASS)}>
            {items.map(({ label, href, icon: Icon }) => {
              const fullHref = `${base}${href}`;
              const isActive = href === "" ? pathname === base : pathname.startsWith(fullHref);
              return (
                <li key={href} className="flex-1">
                  <Link
                    href={fullHref}
                    prefetch
                    aria-current={isActive ? "page" : undefined}
                    aria-label={label}
                    onClick={(e) => {
                      haptic("light");
                      if (isActive) {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    className="group relative flex flex-col items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="trip-nav-pill"
                        transition={spring}
                        className="absolute inset-0 rounded-full bg-foreground/[0.08] dark:bg-foreground/[0.12]"
                      />
                    )}
                    <motion.span
                      initial={false}
                      animate={{ height: compact ? 44 : 56 }}
                      transition={spring}
                      className="relative flex flex-col items-center justify-center gap-0.5"
                    >
                      <Icon
                        size={22}
                        strokeWidth={isActive ? 2.3 : 1.9}
                        className={cn(
                          "transition-[color,transform] duration-200 group-active:scale-90",
                          isActive ? "text-primary" : "text-foreground/70"
                        )}
                      />
                      <motion.span
                        initial={false}
                        animate={{ opacity: compact ? 0 : 1, height: compact ? 0 : "auto" }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "overflow-hidden text-[0.6875rem] leading-tight",
                          isActive ? "font-semibold text-foreground" : "font-medium text-foreground/70"
                        )}
                      >
                        {label}
                      </motion.span>
                    </motion.span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <motion.button
            type="button"
            onClick={onPlus}
            whileTap={{ scale: 0.9 }}
            initial={false}
            animate={{ width: compact ? 56 : 68, height: compact ? 56 : 68 }}
            transition={spring}
            aria-label="Ajouter"
            aria-haspopup="dialog"
            className="pointer-events-auto flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-section-strong outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
          >
            <Plus size={26} strokeWidth={2.4} />
          </motion.button>
        </div>
      </nav>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="gap-0 p-0">
          <div className="px-6 pt-8 pr-16 pb-4">
            <SheetTitle>Ajouter</SheetTitle>
            <SheetDescription className="mt-1 text-[0.95rem]">Que veux-tu ajouter au voyage ?</SheetDescription>
          </div>
          <div className="grid grid-cols-2 gap-3 px-5 pb-6">
            {actions.map((a, i) => (
              <motion.button
                key={a.kind}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.05 + i * 0.04 }}
                onClick={() => runAction(a.kind, a.href)}
                className="pressable flex flex-col items-start gap-4 rounded-[1.5rem] bg-secondary p-4 text-left transition-colors hover:bg-foreground/[0.08]"
              >
                <span className={cn("flex size-12 items-center justify-center rounded-2xl shadow-card", a.tile)}>
                  <a.icon size={22} />
                </span>
                <span>
                  <span className="block text-[1.05rem] font-semibold">{a.label}</span>
                  <span className="block text-sm text-muted-foreground">{a.hint}</span>
                </span>
              </motion.button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
