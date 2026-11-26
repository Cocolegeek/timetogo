import { test } from "node:test";
import assert from "node:assert/strict";
import { featuresWithContent } from "../lib/trip-features.ts";
import { canSearch, contentWidth, sectionOf, SEARCH_MIN_ITEMS, visibleSections } from "../lib/trip-sections.ts";

const off = { hasPlanning: false, hasMenus: false, hasLists: false };
const all = { hasPlanning: true, hasMenus: true, hasLists: true };

test("espace neuf, rien de coché : seulement Résumé et Budget", () => {
  assert.deepEqual(visibleSections(off, ""), ["", "/budget"]);
});

test("une case cochée donne son onglet tout de suite, même vide", () => {
  assert.deepEqual(visibleSections({ ...off, hasPlanning: true }, ""), ["", "/budget", "/planning"]);
  assert.deepEqual(visibleSections(all, ""), ["", "/budget", "/planning", "/menus", "/lists"]);
});

test("un espace non coché apparaît dès qu'il contient quelque chose (features venant de featuresWithContent)", () => {
  const f = featuresWithContent({ modules: [] }, { planning: 3, menus: 0, lists: 0 });
  assert.deepEqual(visibleSections(f, ""), ["", "/budget", "/planning"]);
});

test("l'onglet de la page courante ne disparaît jamais, même non coché et vide", () => {
  assert.deepEqual(visibleSections(off, "/menus"), ["", "/budget", "/menus"]);
  assert.deepEqual(visibleSections(off, "/planning"), ["", "/budget", "/planning"]);
});

test("sectionOf reconnaît la section d'après l'adresse", () => {
  const base = "/trips/abc";
  assert.equal(sectionOf(base, base), "");
  assert.equal(sectionOf(`${base}/budget`, base), "/budget");
  assert.equal(sectionOf(`${base}/planning`, base), "/planning");
  assert.equal(sectionOf(`${base}/menus`, base), "/menus");
  assert.equal(sectionOf(`${base}/lists`, base), "/lists");
  assert.equal(sectionOf("/trips", base), null);
});

test("la recherche n'apparaît qu'avec assez de contenu", () => {
  assert.equal(canSearch(0), false);
  assert.equal(canSearch(SEARCH_MIN_ITEMS - 1), false);
  assert.equal(canSearch(SEARCH_MIN_ITEMS), true);
});

test("grand écran : le Résumé est large, les autres pages en colonne de lecture", () => {
  const base = "/trips/abc";
  assert.equal(contentWidth(base, base), "wide");
  assert.equal(contentWidth(`${base}/budget`, base), "narrow");
  assert.equal(contentWidth(`${base}/menus`, base), "narrow");
});
