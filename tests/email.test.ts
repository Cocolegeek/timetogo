import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
});

const email = await import("../lib/auth/email.ts");
const { authCalls, authFail, calls } = await import("./stub-supabase.ts");

beforeEach(() => {
  store.clear();
  authCalls.length = 0;
  calls.length = 0;
  for (const k of Object.keys(authFail)) delete authFail[k];
});

test("isValidEmail / normalizeEmail / normalizeCode", () => {
  assert.equal(email.isValidEmail("  Jean@Exemple.FR "), true);
  assert.equal(email.normalizeEmail("  Jean@Exemple.FR "), "jean@exemple.fr");
  assert.equal(email.isValidEmail("jean@exemple"), false);
  assert.equal(email.isValidEmail("jean exemple@x.fr"), false);
  assert.equal(email.normalizeCode(" 12 34-56 78"), "123456");
});

test("mapAuthError : limites, doublons, réseau, adresse invalide", () => {
  assert.equal(email.mapAuthError({ code: "over_email_send_rate_limit", status: 429 }), "rate_limited");
  assert.equal(email.mapAuthError({ message: "For security purposes, you can only request this after 42 seconds." }), "rate_limited");
  assert.equal(email.mapAuthError({ code: "email_exists" }), "exists");
  assert.equal(email.mapAuthError({ message: "A user with this email address has already been registered" }), "exists");
  assert.equal(email.mapAuthError({ message: "TypeError: Failed to fetch" }), "network");
  assert.equal(email.mapAuthError({ code: "email_address_invalid" }), "invalid_email");
  assert.equal(email.mapAuthError({ code: "signup_disabled" }), "disabled");
  assert.equal(email.mapAuthError(null), "unknown");
});

test("connexion : adresse invalide = aucun appel réseau", async () => {
  const res = await email.sendLoginCode("pas-un-email");
  assert.deepEqual(res, { ok: false, reason: "invalid_email" });
  assert.equal(authCalls.length, 0);
});

test("connexion : envoie le code (création autorisée), puis vérifie avec le type « email »", async () => {
  assert.equal((await email.sendLoginCode(" Jean@Exemple.fr ")).ok, true);
  assert.deepEqual(authCalls[0], { fn: "signInWithOtp", args: { email: "jean@exemple.fr", options: { shouldCreateUser: true } } });
  assert.equal((await email.verifyLoginCode("jean@exemple.fr", "123 456")).ok, true);
  assert.deepEqual(authCalls[1], { fn: "verifyOtp", args: { email: "jean@exemple.fr", token: "123456", type: "email" } });
});

test("code faux ou périmé → invalid_code ; limite → rate_limited", async () => {
  authFail.verifyOtp = { code: "otp_expired", message: "Token has expired or is invalid" };
  assert.deepEqual(await email.verifyLoginCode("a@b.fr", "000000"), { ok: false, reason: "invalid_code" });
  authFail.verifyOtp = { status: 429, message: "rate limit" };
  assert.deepEqual(await email.verifyLoginCode("a@b.fr", "000000"), { ok: false, reason: "rate_limited" });
});

test("sauvegarde d'un invité : jeton de transfert gardé AVANT de rattacher l'e-mail", async () => {
  const res = await email.startEmailUpgrade("jean@exemple.fr");
  assert.equal(res.ok, true);
  assert.equal(store.get("voyou-guest-transfer"), "tok-1");
  assert.deepEqual(calls[0], { op: "rpc", table: "create_guest_transfer" });
  assert.deepEqual(authCalls[0], { fn: "updateUser", args: { email: "jean@exemple.fr" } });
});

test("sauvegarde d'un invité : adresse déjà inscrite → exists (l'écran propose de s'y connecter)", async () => {
  authFail.updateUser = { code: "email_exists", message: "A user with this email address has already been registered" };
  assert.deepEqual(await email.startEmailUpgrade("jean@exemple.fr"), { ok: false, reason: "exists" });
  assert.equal(store.get("voyou-guest-transfer"), "tok-1");
});

test("sauvegarde d'un invité : impossible de créer le jeton → on n'envoie rien", async () => {
  authFail.rpc_create = { message: "boom" };
  assert.deepEqual(await email.startEmailUpgrade("jean@exemple.fr"), { ok: false, reason: "unknown" });
  assert.equal(authCalls.length, 0);
});

test("vérification du code d'une sauvegarde : type « email_change », jeton réclamé, profil complété", async () => {
  store.set("voyou-guest-transfer", "tok-1");
  assert.equal((await email.verifyUpgradeCode("jean@exemple.fr", "654321")).ok, true);
  assert.deepEqual(authCalls[0], { fn: "verifyOtp", args: { email: "jean@exemple.fr", token: "654321", type: "email_change" } });
  assert.ok(calls.some((c) => c.op === "rpc" && c.table === "claim_guest_transfer"));
  assert.deepEqual(calls.find((c) => c.op === "update"), { op: "update", table: "profiles", payload: { email: "jean@exemple.fr" }, id: "u1" });
  assert.equal(store.has("voyou-guest-transfer"), false);
});

test("compte existant : code de connexion SANS création, puis rapatriement des voyages invités", async () => {
  assert.equal((await email.sendExistingAccountCode("jean@exemple.fr")).ok, true);
  assert.deepEqual(authCalls[0], { fn: "signInWithOtp", args: { email: "jean@exemple.fr", options: { shouldCreateUser: false } } });
  store.set("voyou-guest-transfer", "tok-1");
  const res = await email.verifyExistingAccountCode("jean@exemple.fr", "111222");
  assert.deepEqual(res, { ok: true, value: { trips: 2 } });
  assert.deepEqual(authCalls[1], { fn: "verifyOtp", args: { email: "jean@exemple.fr", token: "111222", type: "email" } });
});

test("compte existant : si le rapatriement échoue, la connexion reste réussie (0 voyage)", async () => {
  store.set("voyou-guest-transfer", "tok-1");
  authFail.rpc_claim = { message: "Transfer expired" };
  assert.deepEqual(await email.verifyExistingAccountCode("jean@exemple.fr", "111222"), { ok: true, value: { trips: 0 } });
});
