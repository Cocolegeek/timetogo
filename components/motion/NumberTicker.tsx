"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

interface NumberTickerProps {
  value: number;
  format: (n: number) => string;
  className?: string;
  duration?: number;
}

/**
 * Counts from the previous value (0 on mount) to `value`. Writes to the DOM
 * directly — no re-render per frame. The rendered text never changes, so
 * React never overwrites the animated value.
 */
export function NumberTicker({ value, format, className, duration = 0.9 }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce) {
      node.textContent = format(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    from.current = value;
    return () => controls.stop();
  }, [value, format, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {format(reduce ? value : 0)}
    </span>
  );
}
