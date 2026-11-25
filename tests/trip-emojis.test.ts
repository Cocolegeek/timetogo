import { test } from "node:test";
import assert from "node:assert/strict";
import { flagEmoji, isFlagEmoji, POPULAR_FLAGS, THEME_EMOJIS, tripEmojiChoices } from "../lib/trip-emojis.ts";

test("flagEmoji: code pays vers drapeau, insensible à la casse", () => {
  assert.equal(flagEmoji("fr"), "🇫🇷");
  assert.equal(flagEmoji("IT"), "🇮🇹");
  assert.equal(flagEmoji(" jp "), "🇯🇵");
});

test("flagEmoji: valeurs invalides", () => {
  assert.equal(flagEmoji(""), null);
  assert.equal(flagEmoji(null), null);
  assert.equal(flagEmoji(undefined), null);
  assert.equal(flagEmoji("FRA"), null);
  assert.equal(flagEmoji("1a"), null);
});

test("isFlagEmoji", () => {
  assert.equal(isFlagEmoji("🇫🇷"), true);
  assert.equal(isFlagEmoji("🚆"), false);
  assert.equal(isFlagEmoji("FR"), false);
});

test("drapeaux populaires : tous valides et sans doublon", () => {
  assert.ok(POPULAR_FLAGS.length >= 20);
  assert.ok(POPULAR_FLAGS.every(isFlagEmoji));
  assert.equal(new Set(POPULAR_FLAGS).size, POPULAR_FLAGS.length);
});

test("tripEmojiChoices: le drapeau détecté passe en premier sans doublon", () => {
  const withDetected = tripEmojiChoices("it");
  assert.equal(withDetected[0], "🇮🇹");
  assert.equal(withDetected.filter((e) => e === "🇮🇹").length, 1);
  const other = tripEmojiChoices("ch");
  assert.equal(other.filter((e) => e === "🇨🇭").length, 1);
  assert.equal(tripEmojiChoices(null)[0], THEME_EMOJIS[0]);
  assert.equal(tripEmojiChoices("zz9")[0], THEME_EMOJIS[0]);
});

test("pas d'avion parmi les propositions", () => {
  assert.ok(!tripEmojiChoices("fr").includes("✈️"));
});
