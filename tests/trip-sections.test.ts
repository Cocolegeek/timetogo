import { test } from "node:test";
import assert from "node:assert/strict";
import { canSearch, contentWidth, sectionOf, SEARCH_MIN_ITEMS, visibleSections } from "../lib/trip-sections.ts";

const empty = { planning: 0, menus: 0, lists: 0 };

test("voyage neuf : seulement Résumé et Budget", () => {
  assert.deepEqual(visibleSections(empty, ""), ["", "/budget"]);
});

test("un onglet apparaît dès qu'il contient quelque chose", () => {
  assert.deepEqual(visibleSections({ ...empty, planning: 2 }, ""), ["", "/budget", "/planning"]);
  assert.deepEqual(visibleSections({ planning: 1, menus: 3, lists: 4 }, ""), ["", "/budget", "/planning", "/menus", "/lists"]);
});

test("l'onglet de la page courante ne disparaît jamais, même vide", () => {
  assert.deepEqual(visibleSections(empty, "/menus"), ["", "/budget", "/menus"]);
  assert.deepEqual(visibleSections(empty, "/planning"), ["", "/budget", "/planning"]);
});

test("un espace non coché apparaît quand même dès qu'on y a ajouté quelque chose", () => {
  assert.deepEqual(visibleSections({ planning: 3, menus: 0, lists: 0 }, ""), ["", "/budget", "/planning"]);
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
