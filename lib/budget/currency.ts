import type { Payer } from "@/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Montant converti dans la devise du voyage, arrondi au centime. */
export function toTripAmount(amount: number, rate: number): number {
  return round2(amount * rate);
}

/**
 * Convertit les parts des payeurs (en devise de la dépense) vers la devise du voyage,
 * puis corrige l'écart d'arrondi sur le dernier : la somme des payeurs = le total, au centime.
 */
export function convertPayers(payers: Payer[], rate: number, total: number): Payer[] {
  if (payers.length === 0) return [];
  const converted = payers.map((p) => ({ ...p, amount: round2(p.amount * rate) }));
  const diff = round2(total - converted.reduce((s, p) => s + p.amount, 0));
  if (diff !== 0) converted[converted.length - 1].amount = round2(converted[converted.length - 1].amount + diff);
  return converted;
}

/** « 1 USD = 0,92 EUR » → taux saisi au clavier (virgule ou point). Renvoie 0 si invalide. */
export function parseRate(input: string): number {
  const n = Number(input.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}
