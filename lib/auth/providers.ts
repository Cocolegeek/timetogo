export type AuthProvider = "google" | "facebook";

export const PROVIDER_LABELS: Record<AuthProvider, string> = {
  google: "Google",
  facebook: "Facebook",
};

/** Facebook ne s'affiche qu'une fois configuré dans Supabase puis activé ici (variable Vercel), jamais avant. */
export const FACEBOOK_ENABLED = process.env.NEXT_PUBLIC_FACEBOOK_LOGIN === "true";

export function enabledProviders(): AuthProvider[] {
  return FACEBOOK_ENABLED ? ["google", "facebook"] : ["google"];
}

/** Valeur lue dans une URL : tout ce qui n'est pas un fournisseur connu retombe sur Google. */
export function parseProvider(value: string | null | undefined): AuthProvider {
  return value === "facebook" ? "facebook" : "google";
}

interface IdentityLike {
  identities?: { provider: string }[] | null;
  app_metadata?: { provider?: string } | null;
}

/** Fournisseurs reliés au compte, dans l'ordre où Supabase les liste (sans doublon). */
export function linkedProviders(user: IdentityLike | null | undefined): AuthProvider[] {
  if (!user) return [];
  const names = (user.identities ?? []).map((i) => i.provider);
  if (names.length === 0 && user.app_metadata?.provider) names.push(user.app_metadata.provider);
  const known = names.filter((n): n is AuthProvider => n === "google" || n === "facebook");
  return [...new Set(known)];
}

/** « Google », « Facebook », ou « Google et Facebook » : pour les libellés d'un compte. */
export function providersLabel(providers: AuthProvider[]): string {
  return providers.map((p) => PROVIDER_LABELS[p]).join(" et ");
}

/** « Google » ou « Google ou Facebook » : pour les textes d'invitation. */
export function loginChoicesLabel(): string {
  return enabledProviders().map((p) => PROVIDER_LABELS[p]).join(" ou ");
}
