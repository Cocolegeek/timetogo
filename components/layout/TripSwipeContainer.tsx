"use client";

import { type CSSProperties, type ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "framer-motion";
import {
  LayoutDashboard,
  Wallet,
  Map,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

interface TripTab {
  suffix: string;
  label: string;
  Icon: LucideIcon;
}

const TABS: TripTab[] = [
  { suffix: "", label: "Résumé", Icon: LayoutDashboard },
  { suffix: "/budget", label: "Budget", Icon: Wallet },
  { suffix: "/planning", label: "Planning", Icon: Map },
  { suffix: "/menus", label: "Menus", Icon: UtensilsCrossed },
];

const COMMIT_DISTANCE = 90;       // px — beyond this we navigate
const COMMIT_VELOCITY = 600;      // px/s — flicks faster than this also commit

interface TripSwipeContainerProps {
  tripId: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Drag-to-navigate between trip tabs with a peek of the destination
 * label fading in on the side as the user swipes.
 *
 * - Children are wrapped in a motion.main that translates with the
 *   finger; on release we either commit (navigate to neighbour tab) or
 *   spring back to origin.
 * - Peek pills are absolutely positioned on the screen edges and grow
 *   in opacity / scale as the drag progresses.
 * - ExpenseCard (which uses its own drag-to-delete) is marked
 *   `data-no-tab-swipe` and framer's nested drag will keep its own
 *   pointer capture, preventing accidental tab switches.
 */
export function TripSwipeContainer({
  tripId,
  className,
  style,
  children,
}: TripSwipeContainerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const x = useMotionValue(0);

  // Resolve the active tab from the pathname
  const prefix = `/trips/${tripId}`;
  const suffix = pathname?.startsWith(prefix) ? pathname.slice(prefix.length) : "";
  const currentIndex = TABS.findIndex((t) => t.suffix === suffix);
  const prevTab = currentIndex > 0 ? TABS[currentIndex - 1] : null;
  const nextTab =
    currentIndex >= 0 && currentIndex < TABS.length - 1
      ? TABS[currentIndex + 1]
      : null;

  // Snap back to 0 whenever we land on a new route
  useEffect(() => {
    x.set(0);
  }, [pathname, x]);

  // Peek pill animations driven by the drag offset
  const prevOpacity = useTransform(x, [0, 40, 130], [0, 0.5, 1]);
  const prevScale = useTransform(x, [0, 130], [0.7, 1]);
  const prevX = useTransform(x, [0, 130], [-12, 0]);

  const nextOpacity = useTransform(x, [-130, -40, 0], [1, 0.5, 0]);
  const nextScale = useTransform(x, [-130, 0], [1, 0.7]);
  const nextX = useTransform(x, [-130, 0], [0, 12]);

  const handleDragEnd = (
    _event: PointerEvent | MouseEvent | TouchEvent,
    info: PanInfo
  ) => {
    const { offset, velocity } = info;

    // Swipe LEFT → next tab
    if (
      nextTab &&
      (offset.x < -COMMIT_DISTANCE || velocity.x < -COMMIT_VELOCITY)
    ) {
      router.push(`/trips/${tripId}${nextTab.suffix}`);
      return;
    }

    // Swipe RIGHT → previous tab
    if (
      prevTab &&
      (offset.x > COMMIT_DISTANCE || velocity.x > COMMIT_VELOCITY)
    ) {
      router.push(`/trips/${tripId}${prevTab.suffix}`);
      return;
    }

    // Otherwise spring back to origin
    animate(x, 0, { type: "spring", stiffness: 380, damping: 32 });
  };

  // If we don't recognise the route, just render the content without drag
  if (currentIndex < 0) {
    return (
      <main className={className} style={style}>
        {children}
      </main>
    );
  }

  return (
    <>
      <motion.main
        className={className}
        style={{ ...style, x, touchAction: "pan-y" }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.45}
        dragDirectionLock
        dragMomentum={false}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.main>

      {/* Peek pill — previous tab (revealed when swiping right) */}
      {prevTab && (
        <motion.div
          aria-hidden
          className="fixed left-3 top-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center gap-2 px-3 py-2 rounded-2xl glass-strong border border-foreground/10 text-sm font-semibold text-slate-100 shadow-lg"
          style={{ opacity: prevOpacity, scale: prevScale, x: prevX }}
        >
          <prevTab.Icon size={16} className="text-indigo-300" />
          {prevTab.label}
        </motion.div>
      )}

      {/* Peek pill — next tab (revealed when swiping left) */}
      {nextTab && (
        <motion.div
          aria-hidden
          className="fixed right-3 top-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center gap-2 px-3 py-2 rounded-2xl glass-strong border border-foreground/10 text-sm font-semibold text-slate-100 shadow-lg"
          style={{ opacity: nextOpacity, scale: nextScale, x: nextX }}
        >
          {nextTab.label}
          <nextTab.Icon size={16} className="text-indigo-300" />
        </motion.div>
      )}
    </>
  );
}
