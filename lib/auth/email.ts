import { createClient } from "@/lib/supabase/client";
import { claimGuestTransfer, rememberGuestTransfer } from "@/lib/auth/guest";

/** Longueur du code : doit correspondre à « Email OTP Length » dans Supabase (6 par défaut). */
export const OTP_LENGTH = 6;
/** Supabase n'envoie pas deux e-mails à la même adresse à moins d'une minute d'écart. */
export const RESEND_DELAY_S = 60;

export type EmailFailure = "invalid_email" | "rate_limited" | "exists" | "invalid_code" | "disabled" | "network" | "unknown";
export type EmailOutcome<T = void> = { ok: true; value: T } | { ok: false; reason: EmailFailure };

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function normalizeCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

interface AuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

/** Traduit une erreur Supabase Auth en cas que l'écran sait expliquer. */
export function mapAuthError(error: AuthErrorLike | null | undefined): EmailFailure {
  if (!error) return "unknown";
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  if (/failed to fetch|network|load failed|fetch failed/.test(msg)) return "network";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || error.status === 429 || /rate limit|too many|after \d+ seconds/.test(msg)) {
    return "rate_limited";
  }
  if (code === "email_exists" || code === "user_already_exists" || /already (been )?registered|already exists/.test(msg)) return "exists";
  if (code === "email_address_invalid" || /invalid.*email|unable to validate email/.test(msg)) return "invalid_email";
  if (code === "signup_disabled" || code === "email_provider_disabled" || /signups? (not allowed|disabled)|provider is not enabled|disabled/.test(msg)) {
    return "disabled";
  }
  if (code === "otp_expired" || /expired|invalid|token/.test(msg)) return "invalid_code";
  return "unknown";
}

/** Erreur d'une vérification de code : tout ce qui n'est pas réseau ou limite = code faux ou périmé. */
function mapVerifyError(error: AuthErrorLike): EmailFailure {
  const reason = mapAuthError(error);
  return reason === "network" || reason === "rate_limited" || reason === "disabled" ? reason : "invalid_code";
}

const fail = (reason: EmailFailure): EmailOutcome<never> => ({ ok: false, reason });

/** Connexion : envoie un code. Crée le compte si l'adresse est nouvelle. */
export async function sendLoginCode(email: string): Promise<EmailOutcome> {
  if (!isValidEmail(email)) return fail("invalid_email");
  const { error } = await createClient().auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { shouldCreateUser: true },
  });
  return error ? fail(mapAuthError(error)) : { ok: true, value: undefined };
}

export async function verifyLoginCode(email: string, code: string): Promise<EmailOutcome> {
  const { error } = await createClient().auth.verifyOtp({ email: normalizeEmail(email), token: normalizeCode(code), type: "email" });
  return error ? fail(mapVerifyError(error)) : { ok: true, value: undefined };
}

/**
 * Sauvegarde d'un invité : on rattache l'adresse au MÊME compte (rien à copier).
 * Si l'adresse a déjà un compte, `exists` : l'écran propose alors de s'y connecter pour rapatrier les voyages.
 */
export async function startEmailUpgrade(email: string): Promise<EmailOutcome> {
  if (!isValidEmail(email)) return fail("invalid_email");
  const remembered = await rememberGuestTransfer();
  if (remembered.error) return fail("unknown");
  const { error } = await createClient().auth.updateUser({ email: normalizeEmail(email) });
  return error ? fail(mapAuthError(error)) : { ok: true, value: undefined };
}

export async function verifyUpgradeCode(email: string, code: string): Promise<EmailOutcome> {
  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({ email: normalizeEmail(email), token: normalizeCode(code), type: "email_change" });
  if (error) return fail(mapVerifyError(error));
  await claimGuestTransfer().catch(() => null);
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("profiles").update({ email: normalizeEmail(email) }).eq("id", user.id);
  return { ok: true, value: undefined };
}

/** L'adresse a déjà un compte : on lui envoie un code de connexion (sans en créer un autre). */
export async function sendExistingAccountCode(email: string): Promise<EmailOutcome> {
  const { error } = await createClient().auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { shouldCreateUser: false },
  });
  return error ? fail(mapAuthError(error)) : { ok: true, value: undefined };
}

/** Connecté au compte existant : on y déplace les voyages de l'invité. */
export async function verifyExistingAccountCode(email: string, code: string): Promise<EmailOutcome<{ trips: number }>> {
  const { error } = await createClient().auth.verifyOtp({ email: normalizeEmail(email), token: normalizeCode(code), type: "email" });
  if (error) return fail(mapVerifyError(error));
  try {
    const result = await claimGuestTransfer();
    return { ok: true, value: { trips: result.trips } };
  } catch {
    return { ok: true, value: { trips: 0 } };
  }
}

export const EMAIL_ERROR_MESSAGES: Record<EmailFailure, string> = {
  invalid_email: "Cette adresse e-mail n'a pas l'air valide.",
  rate_limited: "Trop d'essais. Attends une minute avant de redemander un code.",
  exists: "Cette adresse a déjà un compte.",
  invalid_code: "Code incorrect ou expiré. Vérifie-le, ou demande-en un nouveau.",
  disabled: "La connexion par e-mail n'est pas disponible pour le moment.",
  network: "Pas de connexion. Réessaie quand le réseau est revenu.",
  unknown: "Ça n'a pas marché. Réessaie dans un instant.",
};
