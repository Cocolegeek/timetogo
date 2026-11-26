// Generates the preset avatar library in public/avatars/*.svg.
// Run: node scripts/generate-avatars.mjs  (then keep lib/avatars.ts in sync)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const C = {
  ink: "#1A1D24",
  white: "#FFFFFF",
  sky: "#CFDDE8",
  sand: "#E9E1D3",
  sage: "#C5D3BF",
  clay: "#D99C82",
  night: "#22283A",
  gold: "#F0BE4C",
  lilac: "#D9D3EC",
  peach: "#F4C7A8",
  rose: "#E58B9E",
  teal: "#3D8B7D",
  blue: "#5B7DB1",
};

const head = (fill) => `<circle cx="64" cy="62" r="30" fill="${fill}"/>`;
const body = (fill) => `<path d="M22 128c0-24 18-36 42-36s42 12 42 36z" fill="${fill}"/>`;
const cheeks = `<circle cx="47" cy="70" r="4.5" fill="${C.rose}" opacity=".45"/><circle cx="81" cy="70" r="4.5" fill="${C.rose}" opacity=".45"/>`;

const eyes = {
  dots: `<circle cx="54" cy="60" r="3.6" fill="${C.ink}"/><circle cx="74" cy="60" r="3.6" fill="${C.ink}"/>`,
  happy: `<path d="M50 61q4-5 8 0M70 61q4-5 8 0" stroke="${C.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  wink: `<circle cx="54" cy="60" r="3.6" fill="${C.ink}"/><path d="M70 61q4-5 8 0" stroke="${C.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  sleepy: `<path d="M50 61h8M70 61h8" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`,
  stars: `<path d="M54 54l1.8 3.9 4.2.5-3.1 2.9.8 4.2-3.7-2.1-3.7 2.1.8-4.2-3.1-2.9 4.2-.5z" fill="${C.gold}"/><path d="M74 54l1.8 3.9 4.2.5-3.1 2.9.8 4.2-3.7-2.1-3.7 2.1.8-4.2-3.1-2.9 4.2-.5z" fill="${C.gold}"/>`,
};

const mouths = {
  smile: `<path d="M56 71q8 7 16 0" stroke="${C.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  grin: `<path d="M54 69h20q0 11-10 11t-10-11z" fill="${C.ink}"/><path d="M58 76q6 4 12 0v4h-12z" fill="${C.rose}"/>`,
  tongue: `<path d="M56 70q8 7 16 0" stroke="${C.ink}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M63 74h7v4a3.5 3.5 0 0 1-7 0z" fill="${C.rose}"/>`,
  oh: `<ellipse cx="64" cy="74" rx="4" ry="5" fill="${C.ink}"/>`,
  flat: `<path d="M57 73h14" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`,
};

const acc = {
  sunglasses: `<rect x="44" y="53" width="18" height="13" rx="5" fill="${C.ink}"/><rect x="66" y="53" width="18" height="13" rx="5" fill="${C.ink}"/><path d="M62 58h4" stroke="${C.ink}" stroke-width="3"/><path d="M47 56l5 0" stroke="${C.white}" stroke-width="2" stroke-linecap="round" opacity=".6"/>`,
  roundGlasses: `<circle cx="54" cy="60" r="8" fill="none" stroke="${C.ink}" stroke-width="2.6"/><circle cx="74" cy="60" r="8" fill="none" stroke="${C.ink}" stroke-width="2.6"/><path d="M62 60h4" stroke="${C.ink}" stroke-width="2.6"/>`,
  beret: `<ellipse cx="60" cy="36" rx="30" ry="11" fill="${C.ink}" transform="rotate(-10 60 36)"/><path d="M62 24v-6" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`,
  bucketHat: `<path d="M40 44q2-20 24-20t24 20z" fill="${C.white}"/><path d="M30 46q34-8 68 0l-4 6q-30-6-60 0z" fill="${C.white}"/><path d="M41 42h46" stroke="${C.clay}" stroke-width="4"/>`,
  cap: `<path d="M36 50q0-24 28-24t28 24z" fill="${C.clay}"/><path d="M84 46q14 0 18 6l-18 2z" fill="${C.clay}"/><circle cx="64" cy="27" r="3" fill="${C.ink}"/>`,
  beanie: `<path d="M35 52q0-28 29-28t29 28z" fill="${C.night}"/><rect x="33" y="44" width="62" height="10" rx="5" fill="${C.teal}"/><circle cx="64" cy="20" r="7" fill="${C.white}"/>`,
  headphones: `<path d="M34 62q0-34 30-34t30 34" stroke="${C.ink}" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="28" y="56" width="11" height="20" rx="5" fill="${C.clay}"/><rect x="89" y="56" width="11" height="20" rx="5" fill="${C.clay}"/>`,
  flower: `<g transform="translate(86 36)"><circle cx="0" cy="-7" r="6" fill="${C.white}"/><circle cx="7" cy="0" r="6" fill="${C.white}"/><circle cx="0" cy="7" r="6" fill="${C.white}"/><circle cx="-7" cy="0" r="6" fill="${C.white}"/><circle r="5" fill="${C.gold}"/></g>`,
  chef: `<path d="M42 40h44v-8a10 10 0 0 0-6-18 12 12 0 0 0-16-4 12 12 0 0 0-16 4 10 10 0 0 0-6 18z" fill="${C.white}"/><rect x="42" y="34" width="44" height="10" rx="3" fill="${C.white}" stroke="${C.sand}" stroke-width="2"/>`,
  safari: `<path d="M40 44q2-18 24-18t24 18z" fill="${C.sand}"/><path d="M28 46q36-10 72 0q-36 6-72 0z" fill="${C.sand}"/><path d="M41 41h46" stroke="${C.clay}" stroke-width="5"/>`,
  nightcap: `<path d="M34 50q2-26 30-26q24 0 30 26z" fill="${C.blue}"/><path d="M90 34q14 10 10 28" stroke="${C.blue}" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="100" cy="64" r="6" fill="${C.white}"/><rect x="33" y="44" width="62" height="9" rx="4.5" fill="${C.white}"/>`,
  mustache: `<path d="M64 69q-6-5-14 0q-4 3-8 0q4 9 14 6q6-2 8-6q2 4 8 6q10 3 14-6q-4 3-8 0q-8-5-14 0z" fill="${C.ink}"/>`,
  bandana: `<path d="M38 96q26 16 52 0l-26 22z" fill="${C.rose}"/><circle cx="58" cy="102" r="2" fill="${C.white}"/><circle cx="70" cy="104" r="2" fill="${C.white}"/>`,
  mask: `<rect x="40" y="49" width="48" height="22" rx="11" fill="${C.white}" fill-opacity=".45" stroke="${C.ink}" stroke-width="3"/><path d="M90 76v-34q0-6 6-6" stroke="${C.gold}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  freckles: `<g fill="${C.clay}"><circle cx="47" cy="67" r="1.4"/><circle cx="51" cy="70" r="1.4"/><circle cx="45" cy="71" r="1.4"/><circle cx="81" cy="67" r="1.4"/><circle cx="77" cy="70" r="1.4"/><circle cx="83" cy="71" r="1.4"/></g>`,
  tuft: `<path d="M58 33q2-10 8-12M64 32q4-9 11-9M70 34q6-6 12-4" stroke="${C.ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  bow: `<path d="M64 31l-12-7v14zM64 31l12-7v14z" fill="${C.rose}"/><circle cx="64" cy="31" r="3.5" fill="${C.rose}"/>`,
};

/** id → [label, background, head, shirt, eyes, mouth, accessories in draw order, cheeks?] */
const AVATARS = [
  ["soleil", "Soleil", C.sky, C.gold, C.white, "dots", "smile", ["sunglasses"], false],
  ["parisien", "Parisien", C.sand, C.clay, C.ink, "happy", "smile", ["beret", "mustache"], false],
  ["festival", "Festival", C.lilac, C.sage, C.clay, "happy", "grin", ["bucketHat"], true],
  ["plongee", "Plongée", C.sand, C.sky, C.blue, "dots", "oh", ["mask"], false],
  ["dj", "DJ", C.sage, C.lilac, C.ink, "sleepy", "smile", ["headphones"], true],
  ["skate", "Skate", C.gold, C.white, C.clay, "wink", "tongue", ["cap"], true],
  ["montagne", "Montagne", C.sky, C.clay, C.night, "happy", "grin", ["beanie"], true],
  ["coquin", "Coquin", C.lilac, C.gold, C.teal, "wink", "smile", ["tuft"], true],
  ["lecture", "Lecture", C.sand, C.sage, C.blue, "dots", "flat", ["roundGlasses", "tuft"], false],
  ["fleur", "Fleur", C.gold, C.lilac, C.white, "happy", "smile", ["flower"], true],
  ["chef", "Chef", C.sage, C.peach, C.white, "happy", "grin", ["chef"], true],
  ["explo", "Explo", C.night, C.sand, C.sage, "dots", "smile", ["safari"], false],
  ["dodo", "Dodo", C.lilac, C.sky, C.blue, "sleepy", "oh", ["nightcap"], false],
  ["star", "Star", C.night, C.peach, C.rose, "stars", "grin", ["freckles"], false],
  ["pirate", "Pirate", C.clay, C.sand, C.ink, "dots", "tongue", ["mustache", "bandana"], false],
  ["choupi", "Choupi", C.sky, C.peach, C.sage, "happy", "smile", ["bow", "freckles"], true],
];


const SKIN = { clair: "#F6D5BC", dore: "#EBC08F", hale: "#D9A06F", brun: "#B67A4D", ebene: "#7A4B2E", noir: "#4F2F1E" };
const HAIR = { noir: "#1F1A17", brun: "#5A3A24", blond: "#E6BE62", roux: "#C4572B", gris: "#BFC3C9", rose: "#E86FA0", bleu: "#4D7CC9", blanc: "#F2F2EE" };

const hairBack = {
  long: (h) => `<path d="M32 64q0-36 32-36t32 36v38q-8 6-14 0V74H46v28q-6 6-14 0z" fill="${h}"/>`,
  bob: (h) => `<path d="M33 66q-2-38 31-38t31 38v12q-6 6-12 0V68H45v10q-6 6-12 0z" fill="${h}"/>`,
  afro: (h) => `<circle cx="64" cy="50" r="38" fill="${h}"/>`,
  bun: (h) => `<circle cx="64" cy="24" r="11" fill="${h}"/>`,
  ponytail: (h) => `<path d="M90 50q22 4 16 38q-4-20-22-26z" fill="${h}"/>`,
  boucles: (h) => `<g fill="${h}"><circle cx="40" cy="62" r="11"/><circle cx="88" cy="62" r="11"/><circle cx="44" cy="46" r="12"/><circle cx="84" cy="46" r="12"/></g>`,
};
const hairFront = {
  long: (h) => `<path d="M34 60q2-30 30-30t30 30q-10-16-30-14t-30 14z" fill="${h}"/>`,
  bob: (h) => `<path d="M35 58q4-28 29-28t29 28q-14-8-29-8t-29 8z" fill="${h}"/>`,
  bun: (h) => `<path d="M34 58q2-28 30-28t30 28q-12-12-30-12t-30 12z" fill="${h}"/>`,
  ponytail: (h) => `<path d="M34 58q0-28 30-28t30 28q-8-10-18-11-10 5-22 3-14 2-20 8z" fill="${h}"/>`,
  boucles: (h) => `<g fill="${h}"><circle cx="46" cy="38" r="10"/><circle cx="60" cy="33" r="10"/><circle cx="74" cy="33" r="10"/><circle cx="86" cy="40" r="10"/></g>`,
  court: (h) => `<path d="M34 58q0-28 30-28t30 28q-8-9-19-10-10 4-22 2-14 2-19 8z" fill="${h}"/>`,
  rase: (h) => `<path d="M36 52q2-20 28-20t28 20q-14-9-28-9t-28 9z" fill="${h}"/>`,
  raie: (h) => `<path d="M33 60q0-30 31-30 26 0 31 30-10-14-26-17-18 5-36 17z" fill="${h}"/>`,
  crete: (h) => `<path d="M56 36l4-14 4 10 4-12 4 14z" fill="${h}"/><path d="M40 52q4-12 24-12t24 12q-12-6-24-6t-24 6z" fill="${h}"/>`,
};
const beard = (h) => `<path d="M37 68q0 26 27 26t27-26q-6 14-27 14t-27-14z" fill="${h}"/>`;
const tache = (h) => `<path d="M64 70q-6-5-13 0 4 7 13 5 9 2 13-5-7-5-13 0z" fill="${h}"/>`;

const person = (bg, skin, hairId, hairColor, shirt, eye, mouth, extra = []) => {
  const h = HAIR[hairColor];
  const front = hairFront[hairId] ?? (() => "");
  const back = hairBack[hairId] ?? (() => "");
  const ex = extra.map((e) => (typeof e === "function" ? e(h) : acc[e])).join("");
  return `<rect width="128" height="128" fill="${bg}"/>${body(shirt)}${back(h)}${head(SKIN[skin])}${cheeks}${eyes[eye]}${mouths[mouth]}${front(h)}${ex}`;
};

const characters = {
  justicier: `<rect width="128" height="128" fill="${C.night}"/>${body("#2B2F3A")}<path d="M42 40l3-20 13 12zM86 40l-3-20-13 12z" fill="#2B2F3A"/>${head(SKIN.dore)}<path d="M34 64q0-34 30-34t30 34q-4-6-12-7-6 8-18 8t-18-8q-8 1-12 7z" fill="#2B2F3A"/><path d="M45 57l10 3-10 3zM83 57l-10 3 10 3z" fill="${C.white}"/>${mouths.flat}<path d="M52 98h24" stroke="${C.gold}" stroke-width="5" stroke-linecap="round"/>`,
  colosse: `<rect width="128" height="128" fill="${C.sage}"/>${body("#7B5EA7")}${head("#6BAA55")}<path d="M35 52q29-26 58 0q-8-6-29-6t-29 6z" fill="${HAIR.noir}"/><path d="M47 56l12 4M81 56l-12 4" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/><circle cx="54" cy="62" r="3" fill="${C.ink}"/><circle cx="74" cy="62" r="3" fill="${C.ink}"/>${mouths.grin}`,
  sorcier: `<rect width="128" height="128" fill="${C.lilac}"/>${body("#3B2F4A")}${head(SKIN.clair)}<path d="M33 58q-2-30 26-30 14-4 26 4 12 8 10 26-8-12-18-12-8 4-18 0-10 0-26 12z" fill="${HAIR.noir}"/>${cheeks}${eyes.dots}${acc.roundGlasses}${mouths.smile}<path d="M62 36l-5 9h6l-4 9" stroke="${C.gold}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  astronaute: `<rect width="128" height="128" fill="${C.night}"/>${body("#E8EAEE")}<circle cx="64" cy="62" r="36" fill="#F4F5F7"/><rect x="38" y="44" width="52" height="38" rx="18" fill="#232A3D"/><circle cx="54" cy="62" r="3.6" fill="${C.white}"/><circle cx="74" cy="62" r="3.6" fill="${C.white}"/><path d="M56 72q8 6 16 0" stroke="${C.white}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M46 52q6-4 12-3" stroke="${C.white}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/><circle cx="64" cy="24" r="4" fill="${C.rose}"/>`,
  robot: `<rect width="128" height="128" fill="${C.sky}"/>${body("#8A93A6")}<rect x="34" y="36" width="60" height="56" rx="14" fill="#C9CFDA"/><rect x="44" y="52" width="14" height="12" rx="4" fill="${C.teal}"/><rect x="70" y="52" width="14" height="12" rx="4" fill="${C.teal}"/><path d="M50 78h28" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/><path d="M56 74v8M64 74v8M72 74v8" stroke="${C.ink}" stroke-width="2.5"/><path d="M64 36v-12" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/><circle cx="64" cy="22" r="5" fill="${C.rose}"/>`,
  ninja: `<rect width="128" height="128" fill="${C.clay}"/>${body("#22283A")}${head("#22283A")}<rect x="37" y="52" width="54" height="17" rx="8.5" fill="${SKIN.dore}"/><circle cx="54" cy="60" r="3.4" fill="${C.ink}"/><circle cx="74" cy="60" r="3.4" fill="${C.ink}"/><path d="M34 44h60v8H34z" fill="${C.rose}"/><path d="M92 46l14 8-14 2zM92 50l12 12-12-4z" fill="${C.rose}"/>`,
  viking: `<rect width="128" height="128" fill="${C.sand}"/>${body("#8A5A3B")}${head(SKIN.clair)}${beard(HAIR.roux)}<path d="M36 52q0-24 28-24t28 24z" fill="#9AA0AC"/><path d="M36 50q-14-2-14-18 8 10 16 12zM92 50q14-2 14-18-8 10-16 12z" fill="${C.white}"/>${eyes.dots}<path d="M56 71q8 5 16 0" stroke="${C.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  zombie: `<rect width="128" height="128" fill="${C.night}"/>${body("#5B6B58")}${head("#A9C49A")}<path d="M36 50q4-18 24-16 6-4 18 0 12 4 14 18-10-10-20-8-8 4-16 0-12-4-20 6z" fill="#3A3F2E"/><circle cx="54" cy="61" r="4.4" fill="${C.white}" stroke="${C.ink}" stroke-width="2"/><circle cx="74" cy="61" r="4.4" fill="${C.white}" stroke="${C.ink}" stroke-width="2"/><circle cx="55" cy="62" r="1.6" fill="${C.ink}"/><circle cx="73" cy="62" r="1.6" fill="${C.ink}"/><path d="M54 73h20M58 70v6M64 70v6M70 70v6" stroke="${C.ink}" stroke-width="2.4" stroke-linecap="round"/>`,
  alien: `<rect width="128" height="128" fill="${C.night}"/>${body("#7E8FD0")}<ellipse cx="64" cy="62" rx="34" ry="32" fill="#9DD28C"/><path d="M42 56q10-6 18 6-10 8-18-6zM86 56q-10-6-18 6 10 8 18-6z" fill="${C.ink}"/><circle cx="52" cy="60" r="2" fill="${C.white}"/><circle cx="76" cy="60" r="2" fill="${C.white}"/><path d="M58 76q6 4 12 0" stroke="${C.ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M52 32l-6-12M76 32l6-12" stroke="#9DD28C" stroke-width="4" stroke-linecap="round"/><circle cx="45" cy="19" r="4" fill="${C.gold}"/><circle cx="83" cy="19" r="4" fill="${C.gold}"/>`,
  cowboy: `<rect width="128" height="128" fill="${C.gold}"/>${body("#B65A3A")}<path d="M38 96q26 16 52 0l-26 22z" fill="${C.rose}"/>${head(SKIN.hale)}${cheeks}${eyes.wink}${tache(HAIR.brun)}<path d="M38 46q2-20 26-20t26 20z" fill="#8A5A3B"/><path d="M22 48q42-14 84 0-10 8-42 8T22 48z" fill="#8A5A3B"/><path d="M40 44h48" stroke="${C.ink}" stroke-width="4"/>`,
  vampire: `<rect width="128" height="128" fill="${C.night}"/>${body("#7A1F2B")}<path d="M24 128q0-30 18-38l-6 38zM104 128q0-30-18-38l6 38z" fill="${C.ink}"/>${head("#EDE6EE")}<path d="M34 58q0-28 30-28t30 28q-6-14-18-14-4 8-12 8t-12-8q-12 0-18 14z" fill="${C.ink}"/>${eyes.dots}<path d="M56 72q8 6 16 0" stroke="${C.ink}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M58 75l2 6 2-5M66 75l2 5 2-6" fill="${C.white}" stroke="${C.ink}" stroke-width="1.4"/>`,
  magicien: `<rect width="128" height="128" fill="${C.sky}"/>${body("#4A5A9A")}<path d="M36 66q0 34 28 38 28-4 28-38-8 14-28 14T36 66z" fill="${HAIR.blanc}"/>${head(SKIN.clair)}<path d="M52 72q12 10 24 0 6 14-12 20-18-6-12-20z" fill="${HAIR.blanc}"/>${eyes.happy}${tache(HAIR.blanc)}<path d="M40 44L64 6l24 38z" fill="#4A5A9A"/><path d="M32 46q32-10 64 0-8 6-32 6t-32-6z" fill="#4A5A9A"/><circle cx="64" cy="26" r="3" fill="${C.gold}"/><circle cx="56" cy="38" r="2" fill="${C.gold}"/>`,
  chat: `<rect width="128" height="128" fill="${C.peach}"/>${body("#8E8A86")}${head("#C9C4BE")}<path d="M38 44l-4-22 20 10zM90 44l4-22-20 10z" fill="#C9C4BE"/><path d="M42 40l-2-10 8 4zM86 40l2-10-8 4z" fill="${C.rose}"/>${eyes.dots}<path d="M60 68h8l-4 5z" fill="${C.rose}"/><path d="M64 73q-4 6-9 4M64 73q4 6 9 4" stroke="${C.ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M36 68l-12-3M36 73l-12 3M92 68l12-3M92 73l12 3" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`,
};

const NEW = [
  ["lea", "Léa", person(C.sand, "clair", "long", "blond", C.sage, "happy", "smile")],
  ["amina", "Amina", person(C.lilac, "brun", "afro", "noir", C.gold, "happy", "grin")],
  ["noah", "Noah", person(C.sky, "hale", "court", "brun", C.white, "dots", "smile")],
  ["yuki", "Yuki", person(C.sage, "clair", "bob", "noir", C.clay, "dots", "smile")],
  ["mamadou", "Mamadou", person(C.gold, "ebene", "rase", "noir", C.lilac, "happy", "grin", [beard])],
  ["camille", "Camille", person(C.peach, "dore", "bun", "roux", C.sky, "wink", "smile", ["freckles"])],
  ["leo", "Léo", person(C.night, "clair", "boucles", "roux", C.sand, "dots", "tongue", ["freckles"])],
  ["sofia", "Sofia", person(C.sky, "hale", "ponytail", "brun", C.rose, "happy", "smile")],
  ["idris", "Idris", person(C.clay, "noir", "crete", "noir", C.white, "wink", "grin")],
  ["manon", "Manon", person(C.lilac, "clair", "raie", "rose", C.night, "happy", "smile")],
  ["hugo", "Hugo", person(C.sage, "dore", "raie", "brun", C.clay, "dots", "flat", ["roundGlasses"])],
  ["fatou", "Fatou", person(C.sand, "ebene", "boucles", "noir", C.teal, "happy", "grin")],
  ["jules", "Jules", person(C.gold, "clair", "court", "blond", C.blue, "happy", "grin", [beard])],
  ["ines", "Inès", person(C.sky, "brun", "long", "noir", C.peach, "dots", "smile", ["sunglasses"])],
  ["papi", "Papi", person(C.peach, "clair", "rase", "gris", C.sage, "happy", "smile", ["roundGlasses", tache])],
  ["mamie", "Mamie", person(C.lilac, "clair", "bun", "gris", C.rose, "happy", "smile", ["roundGlasses"])],
  ["reine", "Reine", person(C.lilac, "brun", "long", "noir", "#7A4A8E", "happy", "smile", [() => `<path d="M42 40l4-14 9 9 9-13 9 13 9-9 4 14z" fill="${C.gold}"/>`])],
  ["sage", "Sage", person(C.sage, "noir", "none", "gris", C.gold, "happy", "grin", [beard, "roundGlasses"])],
  ["justicier", "Justicier", characters.justicier],
  ["colosse", "Colosse", characters.colosse],
  ["sorcier", "Apprenti sorcier", characters.sorcier],
  ["astronaute", "Astronaute", characters.astronaute],
  ["robot", "Robot", characters.robot],
  ["ninja", "Ninja", characters.ninja],
  ["viking", "Viking", characters.viking],
  ["zombie", "Zombie", characters.zombie],
  ["alien", "Alien", characters.alien],
  ["cowboy", "Cow-boy", characters.cowboy],
  ["vampire", "Vampire", characters.vampire],
  ["magicien", "Magicien", characters.magicien],
  ["chat", "Chat", characters.chat],
];


const W = (id, label, ...args) => [id, label, person(...args)];
const witchHat = () => `<path d="M40 44L64 4l24 40z" fill="#2B2F3A"/><path d="M30 46q34-10 68 0-8 7-34 7t-34-7z" fill="#2B2F3A"/><path d="M50 40h28" stroke="${C.gold}" stroke-width="4"/>`;
const crown = () => `<path d="M42 40l4-14 9 9 9-13 9 13 9-9 4 14z" fill="${C.gold}"/>`;
const MORE = [
  W("emma", "Emma", C.sky, "clair", "long", "blond", C.rose, "happy", "smile"),
  W("chloe", "Chloé", C.lilac, "clair", "bob", "blond", C.sage, "dots", "smile", ["bow"]),
  W("alice", "Alice", C.sand, "clair", "ponytail", "blond", C.blue, "wink", "grin"),
  W("lola", "Lola", C.gold, "dore", "long", "blond", C.night, "happy", "smile", ["sunglasses"]),
  W("jade", "Jade", C.sage, "clair", "tresses", "blond", C.clay, "happy", "grin"),
  W("zoe", "Zoé", C.peach, "clair", "bun", "blond", C.teal, "dots", "smile", ["flower"]),
  W("julie", "Julie", C.sky, "clair", "boucles", "blond", C.rose, "happy", "smile"),
  W("alix", "Alix", C.lilac, "dore", "court", "blond", C.night, "wink", "smile", ["freckles"]),
  W("mila", "Mila", C.sand, "dore", "long", "blond", C.sage, "stars", "grin"),
  W("sophie", "Sophie", C.sky, "clair", "long", "blond", C.clay, "happy", "smile", ["bucketHat"]),
  W("capucine", "Capucine", C.peach, "clair", "long", "blond", C.lilac, "dots", "smile", ["beret"]),
  W("maelle", "Maëlle", C.sage, "clair", "ponytail", "blond", C.night, "happy", "grin", ["cap"]),
  W("lucie", "Lucie", C.sky, "clair", "long", "roux", C.sage, "happy", "smile", ["freckles"]),
  W("rose", "Rose", C.lilac, "dore", "bun", "roux", C.teal, "wink", "smile"),
  W("ruby", "Ruby", C.gold, "clair", "bob", "roux", C.blue, "dots", "grin", ["freckles"]),
  W("clara", "Clara", C.sand, "hale", "long", "brun", C.rose, "happy", "smile"),
  W("lina", "Lina", C.sage, "brun", "long", "brun", C.lilac, "dots", "smile", ["roundGlasses"]),
  W("sarah", "Sarah", C.peach, "dore", "ponytail", "brun", C.night, "happy", "smile"),
  W("anna", "Anna", C.sky, "clair", "raie", "brun", C.gold, "dots", "flat"),
  W("nina", "Nina", C.gold, "brun", "afro", "noir", C.lilac, "happy", "grin"),
  W("awa", "Awa", C.sand, "ebene", "tresses", "noir", C.sage, "happy", "smile"),
  W("ada", "Ada", C.lilac, "noir", "bun", "noir", C.gold, "dots", "smile", ["roundGlasses"]),
  W("maya", "Maya", C.sky, "brun", "boucles", "noir", C.clay, "wink", "grin"),
  W("kenza", "Kenza", C.peach, "hale", "bob", "noir", C.teal, "happy", "smile"),
  W("yasmine", "Yasmine", C.sage, "hale", "long", "noir", C.rose, "dots", "smile", ["flower"]),
  W("mei", "Mei", C.sand, "clair", "bob", "noir", C.blue, "dots", "smile"),
  W("sakura", "Sakura", C.lilac, "clair", "ponytail", "noir", C.rose, "happy", "smile", ["bow"]),
  W("fanta", "Fanta", C.gold, "noir", "boucles", "noir", C.night, "happy", "grin"),
  W("eva", "Eva", C.sky, "hale", "long", "rose", C.night, "wink", "tongue"),
  W("luna", "Luna", C.night, "clair", "bob", "bleu", C.lilac, "stars", "smile"),
  W("cleo", "Cléo", C.clay, "hale", "tresses", "brun", C.gold, "happy", "smile", [crown]),
  W("zelie", "Zélie", C.sage, "clair", "long", "rose", C.sand, "dots", "smile", ["beanie"]),
  W("sorciere", "Sorcière", C.night, "clair", "long", "noir", "#4A5A9A", "wink", "grin", [witchHat]),
  W("nora", "Nora", C.lilac, "ebene", "court", "noir", C.teal, "happy", "smile"),
  W("tom", "Tom", C.sand, "clair", "court", "brun", C.blue, "dots", "smile"),
  W("adam", "Adam", C.sky, "brun", "boucles", "noir", C.sage, "happy", "grin", [beard]),
  W("paul", "Paul", C.gold, "clair", "raie", "blond", C.rose, "wink", "smile"),
  W("malik", "Malik", C.sage, "ebene", "rase", "noir", C.clay, "dots", "smile"),
  W("enzo", "Enzo", C.peach, "hale", "court", "noir", C.teal, "happy", "tongue"),
];
NEW.push(...MORE);
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "avatars");
mkdirSync(outDir, { recursive: true });

const OLD_HAIR = {
  soleil: ["court", "brun"], dj: ["bob", "rose"], lecture: ["raie", "brun"], fleur: ["long", "roux"],
  chef: ["ponytail", "brun"], star: ["boucles", "blond"], explo: ["court", "noir"], choupi: ["bob", "noir"], festival: ["long", "blond"],
};

for (const [id, , bg, headFill, shirt, eye, mouth, accs, blush] of AVATARS) {
  const [hid, hcol] = OLD_HAIR[id] ?? [];
  const hc = hid ? HAIR[hcol] : "";
  const hb = hid && hairBack[hid] ? hairBack[hid](hc) : "";
  const hf = hid && hairFront[hid] ? hairFront[hid](hc) : "";
  const over = accs.filter((a) => !["bandana"].includes(a)).map((a) => acc[a]).join("");
  const under = accs.includes("bandana") ? acc.bandana : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="${bg}"/>${body(shirt)}${under}${hb}${head(headFill)}${blush ? cheeks : ""}${eyes[eye]}${mouths[mouth]}${hf}${over}</svg>\n`;
  writeFileSync(join(outDir, `${id}.svg`), svg);
}

for (const [id, , inner] of NEW) {
  const content = typeof inner === "function" ? inner() : inner;
  writeFileSync(join(outDir, `${id}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${content}</svg>\n`);
}

console.log([...AVATARS, ...NEW].map(([id, label]) => `  { id: "${id}", label: "${label}" },`).join("\n"));
