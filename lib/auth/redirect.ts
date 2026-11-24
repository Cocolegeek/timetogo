/**
 * Ne garde qu'un chemin interne absolu : il commence par « / » mais pas « // ».
 * Tout le reste retombe sur « /trips » (pas de redirection ouverte).
 */
export function safeRedirectPath(raw: string | null): string {
  if (!raw) return "/trips";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/trips";
  return raw;
}

/**
 * Où renvoyer l'utilisateur quand le fournisseur OAuth répond par une erreur
 * (ex. identity_already_exists pendant la sauvegarde d'un invité).
 * Un retour vers /auth/link garde le fournisseur choisi pour afficher le bon écran.
 */
export function errorRedirectUrl(origin: string, redirectTo: string, errorCode: string): string {
  const isLink = redirectTo.startsWith("/auth/link");
  const url = new URL(isLink ? "/auth/link" : "/login", origin);
  if (isLink) {
    const provider = new URL(redirectTo, origin).searchParams.get("provider");
    if (provider) url.searchParams.set("provider", provider);
  }
  url.searchParams.set("error_code", errorCode);
  return url.toString();
}
