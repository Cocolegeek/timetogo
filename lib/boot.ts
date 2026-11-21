/**
 * The first screen of a launch should appear at once (no entrance fade or
 * stagger); choreography is for moving between screens. True until the user
 * leaves the URL the app was opened on.
 */
const BOOT_PATH = typeof window !== "undefined" ? window.location.pathname : null;
let left = false;

export function isBootScreen(): boolean {
  if (typeof window === "undefined") return true;
  if (!left && window.location.pathname !== BOOT_PATH) left = true;
  return !left;
}

/** `initial` for a framer-motion entrance: skipped on the launch screen (server HTML stays visible). */
export function bootInitial<T>(initial: T): T | false {
  return isBootScreen() ? false : initial;
}
