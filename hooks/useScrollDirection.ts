"use client";

import { useEffect, useState } from "react";

/** "down" while the user scrolls down past `offset`, "up" otherwise (iOS 26 tab bar behaviour). */
export function useScrollDirection(offset = 80): "up" | "down" {
  const [dir, setDir] = useState<"up" | "down">("up");
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - last;
        if (Math.abs(delta) > 6) {
          setDir(delta > 0 && y > offset ? "down" : "up");
          last = y;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return dir;
}
