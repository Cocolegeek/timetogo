import { test } from "node:test";
import assert from "node:assert/strict";
import { shortDestination } from "../lib/place.ts";

test("adresse complète : premier et dernier élément", () => {
  assert.equal(shortDestination("Rome, Roma Capitale, Latium, Italie"), "Rome · Italie");
  assert.equal(shortDestination("Paris, Île-de-France, France métropolitaine, France"), "Paris · France");
});

test("un seul élément ou deux", () => {
  assert.equal(shortDestination("Italie"), "Italie");
  assert.equal(shortDestination("Lisbonne, Portugal"), "Lisbonne · Portugal");
});

test("premier et dernier identiques : pas de répétition", () => {
  assert.equal(shortDestination("Monaco, Monaco"), "Monaco");
});

test("vide ou absent", () => {
  assert.equal(shortDestination(""), "");
  assert.equal(shortDestination(null), "");
  assert.equal(shortDestination(undefined), "");
  assert.equal(shortDestination(" , "), "");
});
