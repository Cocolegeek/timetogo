/** Light vibration feedback where supported (Android / PWA). No-op elsewhere. */
export function haptic(kind: "light" | "success" | "warning" = "light") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  try {
    if (localStorage.getItem("voyou-haptics") === "off") return;
  } catch {
    // storage unavailable: keep the default (on)
  }
  const pattern = kind === "success" ? [10, 40, 18] : kind === "warning" ? [20, 30, 20] : 8;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore: some browsers throw when called without user activation
  }
}
