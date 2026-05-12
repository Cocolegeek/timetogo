/**
 * Section themes drive the dominant accent color of the app.
 *
 * The currently active section is detected from the URL by `getSection()` and
 * exposed as `data-section="..."` on <html>. CSS picks up that attribute and
 * overrides the `--accent-*` and `--mesh-orb-*` variables (see globals.css).
 *
 * Adding a new section?
 *   1. Add it here (id + label)
 *   2. Add the matching `[data-section="<id>"]` block in globals.css
 *   3. Map the route(s) to it in `getSection()`
 *
 * Semantic colors (meal slots, expense categories, planning types,
 * participant colors, trip status badges) are NOT driven by this — they stay
 * fixed to keep their meaning across sections.
 */

export type Section = "overview" | "budget" | "planning" | "menus" | "neutral";

export const SECTION_LABELS: Record<Section, string> = {
  overview: "Résumé",
  budget: "Budget",
  planning: "Planning",
  menus: "Menus",
  neutral: "Voyou",
};

export function getSection(pathname: string): Section {
  // Match `/trips/<id>/<segment>`
  const tripMatch = pathname.match(/^\/trips\/[^/]+\/([^/?#]+)/);
  if (tripMatch) {
    const seg = tripMatch[1];
    if (seg === "budget") return "budget";
    if (seg === "planning") return "planning";
    if (seg === "menus") return "menus";
  }

  // Trip dashboard root (no segment)
  if (/^\/trips\/[^/]+\/?$/.test(pathname)) return "overview";

  // Trips list, new trip, join, settings, login, consent → neutral
  return "neutral";
}
