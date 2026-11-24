/** Fournisseurs OAuth (redirection vers Google / Facebook). */
export type AuthProvider = "google" | "facebook";

/** Tout ce qu'on affiche comme « moyen de connexion » d'un compte. */
export type AccountMethod = AuthProvider | "email";

export const PROVIDER_LABELS: Record<AuthProvider, string> = {
  google: "Google",
  facebook: "Facebook",
};

export const METHOD_LABELS: Record<AccountMethod, string> = {
  ...PROVIDER_LABELS,
  email: "E-mail",
};

/** Facebook ne s'affiche qu'une fois configuré dans Supabase puis activé ici (variable Vercel), jamais avant. */
export const FACEBOOK_ENABLED = process.env.NEXT_PUBLIC_FACEBOOK_LOGIN === "true";

/** La connexion par e-mail (code à 6 chiffres) exige un envoi d'e-mails configuré (SMTP) : même principe. */
export const EMAIL_ENABLED = process.env.NEXT_PUBLIC_EMAIL_LOGIN === "true";

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

/** Moyens de connexion reliés au compte, dans l'ordre où Supabase les liste (sans doublon). */
export function linkedMethods(user: IdentityLike | null | undefined): AccountMethod[] {
  if (!user) return [];
  const names = (user.identities ?? []).map((i) => i.provider);
  if (names.length === 0 && user.app_metadata?.provider) names.push(user.app_metadata.provider);
  const known = names.filter((n): n is AccountMethod => n === "google" || n === "facebook" || n === "email");
  return [...new Set(known)];
}

/** « Google », « Facebook », ou « Google et Facebook » : pour les libellés d'un compte. */
export function methodsLabel(methods: AccountMethod[]): string {
  return methods.map((m) => METHOD_LABELS[m]).join(" et ");
}

/** ["a", "b", "c"] → « a, b ou c » */
export function joinOr(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ou ${items[items.length - 1]}`;
}

/** Choix proposés par Google / Facebook seulement (boutons de redirection). */
export function oauthChoicesLabel(): string {
  return joinOr(enabledProviders().map((p) => PROVIDER_LABELS[p]));
}

/** Tous les choix proposés, e-mail compris : « Google, Facebook ou e-mail ». */
export function loginChoicesLabel(): string {
  return joinOr([...enabledProviders().map((p) => PROVIDER_LABELS[p]), ...(EMAIL_ENABLED ? ["e-mail"] : [])]);
}
