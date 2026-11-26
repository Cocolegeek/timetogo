/* eslint-disable */
// Vérification en navigateur des formulaires (repas, dépense, étape, trajet), sans vraie base.
// Supabase est simulé (cookie de session + routes REST/Auth), Nominatim et /api/routing aussi.
//
// 1. Terminal A : NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=anon npx next dev -p 3112
// 2. Terminal B : NODE_PATH=$(npm root -g) node scripts/e2e/forms.cjs   (Playwright installé ; captures dans le dossier temporaire)
//
// Sert de modèle : pour tester un autre écran, copier `scenario(...)` et changer l'adresse, les données simulées et les contrôles.
const { chromium } = require("playwright");
const OUT = require("path").join(require("os").tmpdir(), "voyou-e2e");
require("fs").mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3112";
const UID = "00000000-0000-0000-0000-0000000000a1";
const TID = "11111111-1111-1111-1111-111111111111";
const P1 = "22222222-2222-2222-2222-222222222221", P2 = "22222222-2222-2222-2222-222222222222";
const b64u = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 3600;
const user = { id: UID, aud: "authenticated", role: "authenticated", email: "test@example.com", is_anonymous: false, app_metadata: { provider: "google" }, user_metadata: { name: "Alice" }, identities: [{ provider: "google" }], created_at: "2026-01-01T00:00:00Z" };
const session = { access_token: `${b64u({ alg: "HS256", typ: "JWT" })}.${b64u({ sub: UID, exp, role: "authenticated" })}.sig`, refresh_token: "r", expires_at: exp, expires_in: 3600, token_type: "bearer", user };
const today = new Date().toISOString().slice(0, 10);
const end = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
const start = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
const trip = { id: TID, name: "Voyage à Rome", type: "trip", destination: "Rome, Roma Capitale, Latium, Italie", emoji: "🇮🇹", currency: "EUR", start_date: start, end_date: new Date(Date.now() + 11 * 864e5).toISOString().slice(0, 10), total_budget: 0, share_code: "ABC123", owner_id: UID, created_at: "2026-06-01T00:00:00Z" };
const participants = [{ id: P1, trip_id: TID, name: "Alice", color: "#111111", created_at: "2026-06-01T00:00:00Z" }, { id: P2, trip_id: TID, name: "Bob", color: "#222222", created_at: "2026-06-01T00:00:01Z" }];
const member = { trip_id: TID, user_id: UID, role: "owner", participant_id: P1, is_primary: true };
const mkExp = (i) => ({ id: `3333333${i}-3333-3333-3333-333333333333`, trip_id: TID, title: "Dépense " + i, amount: 20, currency: "EUR", exchange_rate: 1, amount_in_trip_currency: 20, category: "courses", paid_by_id: P1, payers: [{ participantId: P1, amount: 20 }], date: today, split_mode: "equal", splits: [{ participantId: P1, excluded: false, share: 10 }, { participantId: P2, excluded: false, share: 10 }], notes: null, created_at: "2026-06-08T10:00:00Z", updated_at: "2026-06-08T10:00:00Z" });
const step = { id: "44444444-4444-4444-4444-444444444441", trip_id: TID, date: start, time: "09:00", title: "Colisée", description: null, location: "Rome", destination: null, type: "activity", journey_mode: null, duration_minutes: 90, participant_ids: [], position: 0, created_at: "2026-06-01T00:00:00Z" };
const meal = { id: "55555555-5555-5555-5555-555555555551", trip_id: TID, date: start, slot: "lunch", title: null, category: "home", participant_ids: [], cook_ids: [], dishes: [], position: 0, created_at: "2026-06-01T00:00:00Z" };
const item = { id: "66666666-6666-6666-6666-666666666661", trip_id: TID, list: "bring", title: "Tente", note: null, assignee_ids: [], done: false, position: 0, created_at: "2026-06-01T00:00:00Z" };

const results = [];
const check = (label, ok, extra = "") => { results.push(ok); console.log(`${ok ? "OK    " : "ECHEC "} ${label}${extra ? " | " + extra : ""}`); };

async function scenario(name, M, path, run) {
  console.log(`\n--- ${name}`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: "block" });
  await ctx.addCookies([{ name: "sb-example-auth-token", value: "base64-" + b64u(session), url: BASE }, { name: "gdpr_ok", value: "1", url: BASE }]);
  await ctx.addInitScript(() => { try { localStorage.setItem("voyou-welcomed-v1", "1"); } catch {} });
  const cors = { "access-control-allow-origin": BASE, "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "*" };
  await ctx.route("https://example.supabase.co/**", async (route) => {
    const req = route.request(); const u = new URL(req.url()); const p = u.pathname;
    const json = (body, status = 200) => route.fulfill({ status, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify(body) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (p === "/auth/v1/user") return json(user);
    if (p.startsWith("/auth/v1/")) return json(session);
    if (p.startsWith("/rest/v1/rpc/")) return json(p.endsWith("apply_recurring_expenses") ? 0 : []);
    const table = p.replace("/rest/v1/", ""); const sel = u.searchParams.get("select") || "";
    if (table === "trip_members") { if (sel.includes("trip:trips")) return json([{ role: "owner", participant_id: P1, trip: { ...trip, participants } }]); return json(single ? member : [member]); }
    if (table === "trips") return json(single ? trip : [trip]);
    if (table === "participants") return json(participants);
    if (table === "expenses") return json(req.method() === "POST" ? { ...mkExp(9), title: "Resto" } : M.expenses);
    if (table === "itinerary_items") return json(req.method() === "POST" ? { ...step, id: "44444444-4444-4444-4444-444444444449", title: "Nouveau" } : M.itinerary);
    if (table === "meals") return json(M.meals);
    if (table === "checklist_items") return json(M.lists);
    if (table === "profiles") return json(single ? { id: UID, name: "Alice", avatar_url: null, custom_avatar_url: "/avatars/sun.svg", email: "test@example.com" } : []);
    return json(single ? {} : []);
  });
  await ctx.route("https://nominatim.openstreetmap.org/**", (route) => {
    const q = new URL(route.request().url()).searchParams.get("q") || "";
    const paris = /paris/i.test(q);
    route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
      body: JSON.stringify([paris ? { place_id: 11, display_name: "Paris, Île-de-France, France", lat: "48.85", lon: "2.35", address: { country_code: "fr" } } : { place_id: 12, display_name: "Rome, Latium, Italie", lat: "41.89", lon: "12.49", address: { country_code: "it" } }]) });
  });
  await ctx.route("**/api/routing**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ durationMinutes: 130, distanceKm: 215 }) }));
  globalThis.__writes = [];
  const page = await ctx.newPage();
  page.on("request", (r) => { if (r.method() !== "GET" && r.url().includes("/rest/v1/")) globalThis.__writes.push({ url: r.url(), body: r.postData() }); });
  page.on("pageerror", (e) => console.log("ERREUR PAGE :", e.message.slice(0, 200)));
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await run(page);
  await browser.close();
}
const tabs = async (page) => (await page.getByRole("navigation", { name: "Navigation du voyage" }).getByRole("link").allInnerTexts()).map((t) => t.trim());
const searchVisible = async (page) => (await page.getByRole("button", { name: "Rechercher dans le voyage" }).count()) > 0;

const wrote = (table) => globalThis.__writes.filter((w) => w.url.includes(`/rest/v1/${table}`)).map((w) => w.body || "").join(" ");
const names = async (loc) => (await loc.allInnerTexts()).map((t) => t.trim());

(async () => {
  await scenario("formulaire dépense", { expenses: [], itinerary: [], meals: [], lists: [] }, `/trips/${TID}/budget?new=expense`, async (page) => {
    const dlg = page.getByRole("dialog");
    await dlg.waitFor({ timeout: 8000 });
    await page.waitForTimeout(800);
    check("plus d'onglets", (await dlg.getByRole("tab").count()) === 0 && (await dlg.getByRole("tablist").count()) === 0);
    const amount = dlg.locator("#expense-amount");
    check("clavier ouvert sur le montant", await amount.evaluate((el) => el === document.activeElement));
    const chips = await names(dlg.getByRole("group", { name: "Réglages" }).getByRole("button"));
    check("puces : date, payeur, répartition", chips.join(",") === "Aujourd'hui,Payé par toi,Tout le monde", chips.join(","));
    await page.screenshot({ path: `${OUT}/e1-ouvert.png` });
    await dlg.getByRole("button", { name: "Ajouter la dépense" }).click();
    await page.waitForTimeout(400);
    check("montant vide : le bouton explique au lieu de rester grisé", (await dlg.getByRole("alert").innerText()).includes("montant") && wrote("expenses") === "");
    check("« Annuler » retiré du pied de page (une action, un endroit)", (await dlg.getByRole("button", { name: "Annuler" }).count()) === 0);
    await page.keyboard.type("42,50");
    await page.keyboard.press("Enter");
    check("Entrée passe du montant au titre", await dlg.getByLabel("Pour quoi").evaluate((el) => el === document.activeElement));
    await page.keyboard.type("Resto");
    await dlg.getByRole("button", { name: /Payé par toi/ }).click();
    await page.waitForTimeout(400);
    await dlg.getByRole("button", { name: "Bob" }).first().click();
    await page.waitForTimeout(200);
    await dlg.getByRole("button", { name: "Alice" }).first().click();
    await page.waitForTimeout(300);
    const chips2 = await names(dlg.getByRole("group", { name: "Réglages" }).getByRole("button"));
    check("la puce payeur reflète le choix", chips2.some((t) => t.startsWith("Payé par Bob")), chips2.join(","));
    await page.screenshot({ path: `${OUT}/e2-payeur.png` });
    await dlg.getByRole("button", { name: /Tout le monde/ }).click();
    await page.waitForTimeout(400);
    check("panneau « Pour qui » : modes de répartition", (await dlg.getByRole("tab", { name: "Pourcentages" }).count()) > 0);
    const lb = await dlg.locator("label[for=expense-amount]").boundingBox();
    check("libellé « Montant » invisible (lecteurs d'écran seulement)", !lb || lb.height <= 2, JSON.stringify(lb));
    await page.screenshot({ path: `${OUT}/e3-repartition.png` });
    await page.getByLabel("Pour quoi").click();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    const body = wrote("expenses");
    check("Entrée sur le titre enregistre la dépense", /Resto/.test(body) && /42\.5/.test(body), body.slice(0, 140));
    check("payeur = Bob dans l'enregistrement", /22222222-2222-2222-2222-222222222222/.test(body));
    check("formulaire fermé", (await page.getByRole("dialog").count()) === 0);
  });

  await scenario("formulaire étape", { expenses: [], itinerary: [], meals: [], lists: [] }, `/trips/${TID}/planning?new=step`, async (page) => {
    const dlg = page.getByRole("dialog");
    await dlg.waitFor({ timeout: 8000 });
    await page.waitForTimeout(800);
    check("plus d'onglets", (await dlg.getByRole("tab").count()) === 0 && (await dlg.getByRole("tablist").count()) === 0);
    check("clavier ouvert sur le titre", await dlg.getByLabel("Titre de l'étape").evaluate((el) => el === document.activeElement));
    const chips = await names(dlg.getByRole("group", { name: "Réglages" }).locator("button"));
    check("puces : quand, lieu, type, qui", chips.length === 4 && chips[2] === "Activité" && chips[3] === "Tout le monde", chips.join(","));
    await page.screenshot({ path: `${OUT}/s1-ouvert.png` });
    await dlg.getByRole("button", { name: "Ajouter l'étape" }).click();
    await page.waitForTimeout(400);
    check("sans titre : message et pas d'enregistrement", (await dlg.getByRole("alert").innerText()).includes("titre") && wrote("itinerary_items") === "");
    await dlg.getByLabel("Titre de l'étape").click();
    await page.keyboard.type("Colisée");
    await dlg.locator("button", { hasText: "Activité" }).click();
    await page.waitForTimeout(300);
    await dlg.getByRole("button", { name: "Resto" }).or(dlg.getByRole("button", { name: /Restau|Repas|Resto/ })).first().click().catch(() => {});
    await dlg.getByLabel("Titre de l'étape").click();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    const body = wrote("itinerary_items");
    check("Entrée sur le titre enregistre l'étape", /Colisée/.test(body), body.slice(0, 120));
    check("formulaire étape fermé", (await page.getByRole("dialog").count()) === 0);
  });

  await scenario("formulaire trajet", { expenses: [], itinerary: [], meals: [], lists: [] }, `/trips/${TID}/planning?new=journey`, async (page) => {
    const dlg = page.getByRole("dialog");
    await dlg.waitFor({ timeout: 8000 });
    await page.waitForTimeout(800);
    check("plus d'onglets", (await dlg.getByRole("tab").count()) === 0 && (await dlg.getByRole("tablist").count()) === 0);
    await page.screenshot({ path: `${OUT}/j1-ouvert.png` });
    await dlg.getByRole("button", { name: "Ajouter le trajet" }).click();
    await page.waitForTimeout(400);
    check("sans départ : message clair", (await dlg.getByRole("alert").innerText()).includes("départ"));
    check("mode Avion toujours proposé", (await dlg.getByRole("button", { name: "Avion" }).count()) === 1);
    for (const [label, q] of [["D'où ?", "Paris"], ["Vers où ?", "Rome"]]) {
      await dlg.getByRole("button", { name: label }).click();
      const input = page.getByRole("dialog").last().locator("input").first();
      await input.waitFor({ timeout: 6000 });
      await input.fill(q);
      await page.waitForTimeout(1200);
      await page.getByRole("dialog").last().getByRole("button").filter({ hasText: q }).first().click();
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(1500);
    const chips = await names(dlg.getByRole("group", { name: "Réglages" }).getByRole("button"));
    check("durée calculée seule, sans clic", chips.some((t) => t.includes("2 h 10") && t.includes("215 km")), chips.join(","));
    await page.screenshot({ path: `${OUT}/j2-calcule.png` });
    await dlg.getByRole("button", { name: "Ajouter le trajet" }).click();
    await page.waitForTimeout(1500);
    const body = wrote("itinerary_items");
    check("trajet enregistré avec sa durée", /journey/.test(body) && /130/.test(body), body.slice(0, 140));
    check("formulaire trajet fermé", (await page.getByRole("dialog").count()) === 0);
  });

  console.log(`\n${results.filter(Boolean).length}/${results.length} contrôles réussis`);
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error("ECHEC DU SCRIPT :", e.message.slice(0, 600)); process.exit(1); });
