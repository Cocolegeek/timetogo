/** « Rome, Roma Capitale, Latium, Italie » devient « Rome · Italie ». */
export function shortDestination(destination?: string | null): string {
  const parts = (destination ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  return first.toLowerCase() === last.toLowerCase() ? first : `${first} · ${last}`;
}
