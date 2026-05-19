/**
 * Helpers pour partager les infos de paiement via la share sheet native.
 *
 * Sur mobile (iOS/Android), `navigator.share()` ouvre le sélecteur
 * d'apps natif : l'utilisateur choisit son app bancaire, WhatsApp,
 * SMS, etc. Sur desktop (où l'API est limitée), on bascule sur une
 * copie dans le presse-papiers.
 */

export function formatIban(iban: string | null | undefined): string {
  if (!iban) return "";
  return iban.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

export function canNativeShare(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.share === "function";
}

interface BuildShareParams {
  recipientName: string;
  iban?: string | null;
  phone?: string | null;
  amount?: number | null;
  currencyLabel?: string;
}

export function buildShareText({
  recipientName,
  iban,
  phone,
  amount,
  currencyLabel,
}: BuildShareParams): string {
  const lines: string[] = [];
  if (amount != null && Number.isFinite(amount)) {
    lines.push(
      `Rembourser ${recipientName} — ${amount
        .toFixed(2)
        .replace(".", ",")}${currencyLabel ? ` ${currencyLabel}` : ""}`
    );
  } else {
    lines.push(`Rembourser ${recipientName}`);
  }
  if (iban) lines.push(`IBAN : ${formatIban(iban)}`);
  if (phone) lines.push(`Tél : ${phone}`);
  return lines.join("\n");
}

/**
 * Lance la share sheet native. Retourne `true` si l'utilisateur
 * a déclenché un partage (ou un fallback presse-papiers), `false`
 * s'il a annulé. Ne lève jamais d'erreur visible.
 */
export async function sharePaymentInfo(params: BuildShareParams): Promise<"shared" | "copied" | "cancelled"> {
  const text = buildShareText(params);

  if (canNativeShare()) {
    try {
      await navigator.share({ title: "Remboursement", text });
      return "shared";
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return "cancelled";
      // Some browsers throw if share isn't actually available
      // → fall through to clipboard fallback
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "cancelled";
  }
}
