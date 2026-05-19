export function formatCurrency(amount: number, currency: string): string {
  const rounded = Math.round(amount * 100) / 100;
  const decimals = rounded % 1 === 0 ? 0 : 2;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  }).format(rounded);
}

/**
 * Returns the symbol for a currency code (e.g. "EUR" → "€", "USD" → "$").
 * Falls back to the original code when no symbol is defined.
 */
export function currencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}
