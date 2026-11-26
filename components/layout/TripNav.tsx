"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, m as motion } from "framer-motion";
import {
  CalendarPlus,
  House,
  ListChecks,
  Map,
  Plus,
  Route,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useMountOnce } from "@/hooks/useMountOnce";
import { useIdlePrefetch } from "@/hooks/useIdlePrefetch";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useTrip } from "@/hooks/useTrip";
import { useTripCounts } from "@/hooks/useTripCounts";
import { dispatchQuickAdd, type QuickAddKind } from "@/hooks/useQuickAdd";
import { useToast } from "@/components/shared/Toaster";
import { ADD_LABELS, contextKind, leadKind, orderActions } from "@/lib/quick-add";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { featuresForType } from "@/lib/trip-features";
import { sectionOf, visibleSections } from "@/lib/trip-sections";
import type { TripType } from "@/types";

const QuickAddSheet = dynamic(() => import("@/components/layout/QuickAddSheet"), { ssr: false });

type NavItem = { label: string; href: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { label: "Résumé", href: "", icon: House },
  { label: "Budget", href: "/budget", icon: Wallet },
  { label: "Planning", href: "/planning", icon: Map },
  { label: "Menus", href: "/menus", icon: UtensilsCrossed },
  { label: "Listes", href: "/lists", icon: ListChecks },
];

const QUICK_ADD: {
  kind: QuickAddKind;
  label: string;
  icon: LucideIcon;
  tile: string;
  href: string;
  voyageOnly: boolean;
}[] = [
  { kind: "expense", label: "Dépense", icon: Wallet, tile: "bg-primary text-primary-foreground", href: "/budget", voyageOnly: false },
  { kind: "step", label: "Étape", icon: CalendarPlus, tile: "bg-emerald-500 text-white", href: "/planning", voyageOnly: true },
  { kind: "journey", label: "Trajet", icon: Route, tile: "bg-sky-500 text-white", href: "/planning", voyageOnly: true },
  { kind: "meal", label: "Repas", icon: UtensilsCrossed, tile: "bg-rose-500 text-white", href: "/menus", voyageOnly: true },
  { kind: "item", label: "Liste", icon: ListChecks, tile: "bg-amber-500 text-white", href: "/lists", voyageOnly: false },
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
  const sheetMounted = useMountOnce(addOpen);

  const counts = useTripCounts(tripId);
  const shown = visibleSections(features, counts, sectionOf(pathname, base));
  const items = NAV_ITEMS.filter((item) => shown.includes(item.href as (typeof shown)[number]));
  const labelSize = items.length <= 3 ? "text-[0.8125rem]" : items.length === 4 ? "text-xs" : "text-[0.6875rem]";
  const available = QUICK_ADD.filter((a) => !a.voyageOnly || tripType === "trip");
  const context = contextKind(pathname, base, tripType);
  const lead = leadKind(context, available.map((a) => a.kind));
  const actions = orderActions(available, lead);
  const toast = useToast();
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  useIdlePrefetch(["/trips", ...items.map((i) => `${base}${i.href}`)]);

  const runAction = (kind: QuickAddKind, href: string) => {
    setAddOpen(false);
    const target = `${base}${href}`;
    if (pathname === target) dispatchQuickAdd(kind);
    else router.push(`${target}?new=${kind}`);
  };

  const startPress = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      haptic("success");
      setAddOpen(true);
    }, 450);
  };
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  /** Une seule fois, au 3e ajout direct : on apprend le geste du choix complet sans jamais l'imposer. */
  const teachLongPress = () => {
    try {
      const n = Number(localStorage.getItem("voyou-plus-uses") ?? "0") + 1;
      localStorage.setItem("voyou-plus-uses", String(n));
      if (n === 3) toast({ message: "Astuce : maintiens + pour ajouter autre chose", duration: 4500 });
    } catch {
      // storage unavailable: no hint
    }
  };

  const onPlus = () => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    haptic("light");
    if (context && actions.some((a) => a.kind === context)) {
      const a = actions.find((x) => x.kind === context)!;
      runAction(a.kind, a.href);
      teachLongPress();
    } else if (actions.length === 1) {
      runAction(actions[0].kind, actions[0].href);
    } else {
      setAddOpen(true);
    }
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
            <AnimatePresence initial={false}>
            {items.map(({ label, href, icon: Icon }) => {
              const fullHref = `${base}${href}`;
              const isActive = href === "" ? pathname === base : pathname.startsWith(fullHref);
              return (
                <motion.li
                  key={href}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={spring}
                  className="flex-1"
                >
                  <Link
                    href={fullHref}
                    prefetch={false}
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
                          "overflow-hidden leading-tight",
                          labelSize,
                          isActive ? "font-semibold text-foreground" : "font-medium text-foreground/70"
                        )}
                      >
                        {label}
                      </motion.span>
                    </motion.span>
                  </Link>
                </motion.li>
              );
            })}
            </AnimatePresence>
          </ul>

          {context && (
            <button type="button" onClick={() => setAddOpen(true)} className="sr-only">
              Plus d&apos;options d&apos;ajout
            </button>
          )}
          <motion.button
            type="button"
            onClick={onPlus}
            onPointerDown={startPress}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            onPointerCancel={endPress}
            onContextMenu={(e) => {
              e.preventDefault();
              setAddOpen(true);
            }}
            whileTap={{ scale: 0.9 }}
            initial={false}
            animate={{ width: compact ? 56 : 68, height: compact ? 56 : 68 }}
            transition={spring}
            aria-label={context ? ADD_LABELS[context] : "Ajouter"}
            aria-haspopup={context ? undefined : "dialog"}
            className="pointer-events-auto flex shrink-0 touch-manipulation items-center justify-center rounded-full bg-primary text-primary-foreground shadow-section-strong outline-none select-none [-webkit-touch-callout:none] focus-visible:ring-4 focus-visible:ring-primary/30"
          >
            <Plus size={26} strokeWidth={2.4} />
          </motion.button>
        </div>
      </nav>

      {sheetMounted && <QuickAddSheet open={addOpen} onOpenChange={setAddOpen} actions={actions} onPick={runAction} />}
    </>
  );
}
