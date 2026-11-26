import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAddedAt, formatClock } from "../lib/format-date.ts";

const at = (y: number, m: number, d: number, h: number, min: number) => new Date(y, m - 1, d, h, min).toISOString();

test("formatClock : l'heure locale sur deux chiffres", () => {
  assert.equal(formatClock(at(2026, 11, 26, 14, 32)), "14:32");
  assert.equal(formatClock(at(2026, 11, 26, 9, 5)), "09:05");
});

test("formatClock : vide si absent ou invalide", () => {
  assert.equal(formatClock(null), "");
  assert.equal(formatClock(undefined), "");
  assert.equal(formatClock("n'importe quoi"), "");
});

test("formatAddedAt : jour, mois abrégé et heure", () => {
  const label = formatAddedAt(at(2026, 11, 26, 14, 32), new Date(2026, 11, 1));
  assert.match(label, /26/);
  assert.match(label, /nov/);
  assert.match(label, /14:32$/);
  assert.doesNotMatch(label, /2026/);
});

test("formatAddedAt : l'année quand ce n'est pas l'année en cours", () => {
  assert.match(formatAddedAt(at(2025, 12, 31, 23, 5), new Date(2026, 5, 1)), /2025/);
});

test("formatAddedAt : vide si invalide", () => {
  assert.equal(formatAddedAt(""), "");
  assert.equal(formatAddedAt("x"), "");
});
