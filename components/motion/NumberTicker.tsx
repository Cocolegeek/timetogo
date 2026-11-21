"use client";

import { useEffect, useRef, useState } from "react";
import { isBootScreen } from "@/lib/boot";

interface NumberTickerProps {
  value: number;
  format: (n: number) => string;
  className?: string;
  duration?: number;
}

const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

function reducedMotion(): boolean {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("reduce-motion")
  );
}

/**
 * Counts from the previous value to `value`, writing to the DOM directly (no
 * re-render per frame). On the launch screen the real amount shows at once;
 * the count only plays when the value changes afterwards.
 */
export function NumberTicker({ value, format, className, duration = 0.9 }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [initial] = useState(() => (isBootScreen() ? value : 0));
  const from = useRef(initial);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const start = from.current;
    from.current = value;
    if (start === value || reducedMotion()) {
      node.textContent = format(value);
      return;
    }
    let frame = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / (duration * 1000));
      node.textContent = format(start + (value - start) * easeOutQuint(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, format, duration]);

  return (
    <span ref={ref} className={className}>
      {format(initial)}
    </span>
  );
}
