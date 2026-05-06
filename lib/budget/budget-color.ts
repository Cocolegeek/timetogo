/**
 * Returns an HSL color that smoothly transitions from emerald (low) to red (high)
 * based on the percentage of the budget consumed.
 *
 * - 0–50 %  : emerald, "all good"
 * - 50–100 %: gradient emerald → amber → orange → red
 * - 100 %+ : red, "over budget"
 */
export function getBudgetColor(pct: number): string {
  const clamped = Math.max(0, pct);
  if (clamped <= 50) return "hsl(142, 72%, 45%)"; // emerald-500
  if (clamped >= 100) return "hsl(0, 84%, 60%)"; // red-500

  // Interpolate hue from 142 (emerald) at 50 % down to 0 (red) at 100 %
  const t = (clamped - 50) / 50; // 0 → 1
  const hue = 142 - 142 * t;

  // Slightly desaturate / lighten towards the red end for a softer look
  const saturation = 70 + 14 * t; // 70 → 84
  const lightness = 48 + 12 * t; // 48 → 60

  return `hsl(${hue.toFixed(0)}, ${saturation.toFixed(0)}%, ${lightness.toFixed(0)}%)`;
}

/** Tailwind text-color classes mirroring the bar color (for labels). */
export function getBudgetTextColor(pct: number): string {
  if (pct >= 100) return "text-red-400";
  if (pct >= 85) return "text-orange-400";
  if (pct >= 70) return "text-amber-400";
  return "text-emerald-400";
}
