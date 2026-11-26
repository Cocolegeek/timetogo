import { test } from "node:test";
import assert from "node:assert/strict";
import { friendlyDay } from "../lib/format-date.ts";

const today = new Date(2026, 10, 26, 15, 30);

test("aujourd'hui, demain, hier", () => {
  assert.equal(friendlyDay("2026-11-26", today), "Aujourd'hui");
  assert.equal(friendlyDay("2026-11-27", today), "Demain");
  assert.equal(friendlyDay("2026-11-25", today), "Hier");
});

test("autre jour : jour abrégé, numéro et mois", () => {
  const label = friendlyDay("2026-12-05", today);
  assert.match(label, /^[A-Z]/);
  assert.match(label, /5/);
  assert.match(label, /déc/);
});

test("changement de mois et d'année", () => {
  assert.equal(friendlyDay("2027-01-01", new Date(2026, 11, 31)), "Demain");
});

test("valeur vide ou invalide", () => {
  assert.equal(friendlyDay("", today), "");
  assert.equal(friendlyDay("n'importe quoi", today), "n'importe quoi");
});
