/** Collections d'avatars libres (DiceBear), toutes sous licence CC0 : aucune attribution à afficher. */
export const AVATAR_STYLES = [
  { id: "lorelei", label: "Illustrés" },
  { id: "notionists", label: "Croquis" },
  { id: "openPeeps", label: "Portraits" },
  { id: "pixelArt", label: "Pixel" },
  { id: "thumbs", label: "Rigolos" },
] as const;

export type AvatarStyleId = (typeof AVATAR_STYLES)[number]["id"];

export const SEED_PATTERN = /^[A-Za-z0-9_-]{1,48}$/;

export function isAvatarStyle(value: string | null): value is AvatarStyleId {
  return AVATAR_STYLES.some((s) => s.id === value);
}

/** Adresse relative : tient dans `custom_avatar_url` / `participants.avatar` comme n'importe quelle image. */
export function dicebearUrl(style: AvatarStyleId, seed: string): string {
  return `/api/avatar?style=${style}&seed=${encodeURIComponent(seed)}`;
}
