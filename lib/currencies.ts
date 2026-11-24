export const CURRENCIES = [
  "EUR", "USD", "GBP", "CHF", "CAD", "JPY", "AUD", "NZD", "SEK", "NOK", "DKK",
  "PLN", "CZK", "HUF", "RON", "TRY", "MAD", "TND", "MXN", "BRL", "THB", "IDR",
  "CNY", "INR", "ZAR", "AED", "ISK", "HRK",
] as const;

/** Les monnaies proposées à la création d'un voyage (les plus courantes). */
export const TRIP_CURRENCIES = ["EUR", "USD", "GBP", "JPY", "CHF", "CAD"] as const;

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
