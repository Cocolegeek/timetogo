import type { Transition, Variants } from "framer-motion";

/** Ease-out-expo: fast start, long soft landing. Used for entrances. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/** iOS sheet curve. */
export const EASE_SHEET = [0.32, 0.72, 0, 1] as const;

/** Snappy spring for UI state changes (indicators, toggles, chips). */
export const spring: Transition = { type: "spring", stiffness: 520, damping: 40, mass: 0.9 };
/** Softer spring for larger surfaces. */
export const springSoft: Transition = { type: "spring", stiffness: 280, damping: 32 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: EASE_OUT } },
};

export function stagger(step = 0.045, delay = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: step, delayChildren: delay } },
  };
}
