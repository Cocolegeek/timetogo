/**
 * Génère les deep links pour les apps de remboursement.
 *
 * Notes :
 * - Lydia : universal link `https://lydia-app.com/collect/{e164}`
 *   (intercepté par l'app sur mobile, ouvre une page web sinon).
 * - Wero : pas de schéma officiel public ; on tente
 *   `https://wero.eu/pay?phone={e164}` qui redirige vers la landing
 *   à défaut d'ouvrir l'app.
 *
 * Les liens cassent si Lydia / Wero changent leur API — c'est
 * accepté comme contrepartie d'avoir des liens directs.
 */

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/[^\d+]/g, "");
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("00")) return `+${trimmed.slice(2)}`;
  if (trimmed.startsWith("0") && trimmed.length === 10) {
    return `+33${trimmed.slice(1)}`;
  }
  return trimmed;
}

export function lydiaLink(phone: string | null | undefined): string | null {
  const e164 = normalizePhone(phone);
  if (!e164) return null;
  return `https://lydia-app.com/collect/${e164.replace("+", "")}`;
}

export function weroLink(phone: string | null | undefined): string | null {
  const e164 = normalizePhone(phone);
  if (!e164) return null;
  return `https://wero.eu/pay?phone=${encodeURIComponent(e164)}`;
}

export function formatIban(iban: string | null | undefined): string {
  if (!iban) return "";
  return iban.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}
