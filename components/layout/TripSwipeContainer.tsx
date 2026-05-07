"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Order of the trip tabs as exposed in the bottom nav. */
const TAB_SUFFIXES = ["", "/budget", "/planning", "/menus"] as const;

const SWIPE_THRESHOLD = 70;       // px the finger must travel
const SWIPE_TIME_MAX = 500;       // ms — anything slower is treated as a pan
const AXIS_LOCK_RATIO = 1.4;      // |dx| / |dy| — must be primarily horizontal
const EDGE_GUARD = 24;            // px from the screen edge — avoid iOS back-swipe

interface TripSwipeContainerProps {
  tripId: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Wraps the trip layout content with horizontal-swipe navigation
 * between the four sub-tabs (Résumé / Budget / Planning / Menus).
 *
 * Skips the gesture when:
 *  - Touch starts on an element marked `data-no-tab-swipe`
 *    (e.g. the ExpenseCard's drag-to-delete area).
 *  - An input/textarea is focused.
 *  - The touch starts very close to a vertical edge (back-swipe friendly).
 *  - The movement is primarily vertical (regular page scroll).
 */
export function TripSwipeContainer({
  tripId,
  className,
  style,
  children,
}: TripSwipeContainerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const ref = useRef<HTMLElement>(null);

  // Resolve the index of the currently visible tab (-1 if unknown)
  const currentIndex = (() => {
    const prefix = `/trips/${tripId}`;
    if (!pathname?.startsWith(prefix)) return -1;
    const suffix = pathname.slice(prefix.length);
    const idx = TAB_SUFFIXES.indexOf(suffix as (typeof TAB_SUFFIXES)[number]);
    return idx;
  })();

  useEffect(() => {
    const el = ref.current;
    if (!el || currentIndex < 0) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Skip if started inside a draggable / scrollable carve-out
      if (target.closest("[data-no-tab-swipe]")) return;

      // Skip if a text field is currently focused
      const ae = document.activeElement;
      if (
        ae instanceof HTMLElement &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.tagName === "SELECT" ||
          ae.isContentEditable)
      )
        return;

      const t = e.touches[0];
      // Skip touches starting near the edges (iOS back-swipe area, scrollbars…)
      if (
        t.clientX < EDGE_GUARD ||
        t.clientX > window.innerWidth - EDGE_GUARD
      )
        return;

      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
      tracking = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;

      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startTime;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (dt > SWIPE_TIME_MAX) return;
      if (absDx < SWIPE_THRESHOLD) return;
      if (absDx < absDy * AXIS_LOCK_RATIO) return; // too vertical

      let target = -1;
      if (dx < 0 && currentIndex < TAB_SUFFIXES.length - 1)
        target = currentIndex + 1;
      else if (dx > 0 && currentIndex > 0) target = currentIndex - 1;
      if (target < 0) return;

      router.push(`/trips/${tripId}${TAB_SUFFIXES[target]}`);
    };

    const onCancel = () => {
      tracking = false;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onCancel, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  }, [currentIndex, tripId, router]);

  return (
    <main ref={ref} className={className} style={style}>
      {children}
    </main>
  );
}
