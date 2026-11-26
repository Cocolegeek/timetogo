import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_MODULES as ALL } from "../lib/trip-features.ts";
import { contextKind, leadKind, orderActions } from "../lib/quick-add.ts";
import { guessCategory } from "../lib/budget/guess-category.ts";
import { recentTitles } from "../lib/budget/recent-titles.ts";

const B = "/trips/abc";

test("le + agit selon l'écran : budget, planning, menus, listes ; accueil = pas d'action directe", () => {
  assert.equal(contextKind(`${B}/budget`, B, ALL), "expense");
  assert.equal(contextKind(`${B}/planning`, B, ALL), "step");
  assert.equal(contextKind(`${B}/menus`, B, ALL), "meal");
  assert.equal(contextKind(`${B}/lists`, B, ALL), "item");
  assert.equal(contextKind(B, B, ALL), null);
  assert.equal(contextKind("/settings", B, ALL), null);
});

test("un budget de groupe n'a ni planning ni menus : le + y propose le choix", () => {
  assert.equal(contextKind(`${B}/budget`, B, ["lists"]), "expense");
  assert.equal(contextKind(`${B}/lists`, B, ["lists"]), "item");
  assert.equal(contextKind(`${B}/planning`, B, ["lists"]), null);
  assert.equal(contextKind(`${B}/menus`, B, ["lists"]), null);
});

test("un autre voyage ne déclenche rien (préfixe exact)", () => {
  assert.equal(contextKind("/trips/abcd/budget", B, ALL), null);
  assert.equal(contextKind(`${B}/budgetary`, B, ALL), null);
});

test("choix en tête : l'action de l'écran, sinon la dépense ; ordre des autres inchangé", () => {
  const all = ["expense", "step", "journey", "meal", "item"] as const;
  const actions = all.map((kind) => ({ kind }));
  assert.equal(leadKind("meal", [...all]), "meal");
  assert.equal(leadKind(null, [...all]), "expense");
  assert.equal(leadKind("meal", ["expense", "item"]), "expense");
  assert.deepEqual(orderActions(actions, "meal").map((a) => a.kind), ["meal", "expense", "step", "journey", "item"]);
  assert.deepEqual(orderActions(actions, "expense").map((a) => a.kind), [...all]);
  assert.deepEqual(orderActions(actions, null).map((a) => a.kind), [...all]);
});

test("catégorie devinée d'après le titre (accents et casse ignorés)", () => {
  assert.equal(guessCategory("Resto chez Léa"), "restaurant");
  assert.equal(guessCategory("PIZZA"), "restaurant");
  assert.equal(guessCategory("Courses Carrefour"), "courses");
  assert.equal(guessCategory("Marché du matin"), "courses");
  assert.equal(guessCategory("Essence"), "transport");
  assert.equal(guessCategory("Péage A7"), "transport");
  assert.equal(guessCategory("Location de voiture"), "transport");
  assert.equal(guessCategory("Hôtel du port"), "accommodation");
  assert.equal(guessCategory("Airbnb"), "accommodation");
  assert.equal(guessCategory("Musée d'Orsay"), "activities");
  assert.equal(guessCategory("Forfait ski"), "activities");
});

test("catégorie devinée : le plus précis gagne, et on ne force jamais", () => {
  assert.equal(guessCategory("Hôtel restaurant"), "accommodation");
  assert.equal(guessCategory("Taxi aéroport"), "transport");
  assert.equal(guessCategory(""), null);
  assert.equal(guessCategory("ab"), null);
  assert.equal(guessCategory("Cadeau pour Léa"), null);
  assert.equal(guessCategory("Barbecue"), null);
});

test("titres récents : distincts, du plus récent au plus ancien, sans remboursements", () => {
  const e = (title: string, category: string, createdAt: string) => ({ title, category, createdAt }) as never;
  const out = recentTitles([
    e("Courses", "courses", "2026-06-08T10:00:00Z"),
    e("Resto", "restaurant", "2026-06-08T12:00:00Z"),
    e("courses ", "courses", "2026-06-07T10:00:00Z"),
    e("Remboursement A → B", "reimbursement", "2026-06-08T13:00:00Z"),
    e("", "other", "2026-06-08T14:00:00Z"),
    e("Essence", "transport", "2026-06-06T10:00:00Z"),
  ]);
  assert.deepEqual(out.map((r) => r.title), ["Resto", "Courses", "Essence"]);
  assert.equal(out[1].category, "courses");
  assert.equal(recentTitles([e("a", "other", "1"), e("b", "other", "2"), e("c", "other", "3")], 2).length, 2);
});
