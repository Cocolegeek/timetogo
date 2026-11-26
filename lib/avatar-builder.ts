/**
 * Créateur d'avatar : une configuration (peau, cheveux, yeux, accessoires, fond) devient une image SVG.
 * L'avatar est enregistré sous forme d'URL de données (`data:image/svg+xml`) : aucune image à héberger,
 * et tous les écrans qui affichent un avatar (<img src>) fonctionnent sans changement.
 * La configuration est recopiée dans un commentaire du SVG pour pouvoir rouvrir l'éditeur.
 */

export const SKINS = ["#F6D5BC", "#EBC08F", "#D9A06F", "#B67A4D", "#7A4B2E", "#4F2F1E"] as const;
export const HAIR_COLORS = ["#1F1A17", "#5A3A24", "#E6BE62", "#C4572B", "#BFC3C9", "#E86FA0", "#4D7CC9", "#F2F2EE"] as const;
export const BACKGROUNDS = ["#CFDDE8", "#E9E1D3", "#C5D3BF", "#D99C82", "#D9D3EC", "#F4C7A8", "#F0BE4C", "#22283A"] as const;
const SHIRTS = ["#3D8B7D", "#5B7DB1", "#C95F82", "#B8901F", "#8E6BBF", "#D9734E", "#4E8A48", "#4A5A9A"] as const;

export const HAIR_STYLES = ["chauve", "court", "rase", "raie", "long", "bob", "tresses", "bun", "ponytail", "boucles", "afro", "crete"] as const;
export const EYES = ["dots", "happy", "wink", "sleepy", "stars"] as const;
export const MOUTHS = ["smile", "grin", "tongue", "oh", "flat"] as const;
export const FACIAL = ["none", "beard", "mustache"] as const;
export const GLASSES = ["none", "round", "sun"] as const;
export const HATS = ["none", "beanie", "cap", "bucket", "beret", "cowboy", "crown", "viking", "wizard", "chef"] as const;
export const MASKS = ["none", "justicier", "diving"] as const;

export interface AvatarConfig {
  skin: number;
  hair: (typeof HAIR_STYLES)[number];
  hairColor: number;
  eyes: (typeof EYES)[number];
  mouth: (typeof MOUTHS)[number];
  facial: (typeof FACIAL)[number];
  glasses: (typeof GLASSES)[number];
  hat: (typeof HATS)[number];
  mask: (typeof MASKS)[number];
  bg: number;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: 1,
  hair: "court",
  hairColor: 1,
  eyes: "dots",
  mouth: "smile",
  facial: "none",
  glasses: "none",
  hat: "none",
  mask: "none",
  bg: 0,
};

const INK = "#1A1D24";
const WHITE = "#FFFFFF";
const ROSE = "#E58B9E";
const GOLD = "#F0BE4C";
const SAND = "#E9E1D3";
const NIGHT = "#22283A";

const eyesSvg: Record<AvatarConfig["eyes"], string> = {
  dots: `<circle cx="54" cy="60" r="3.6" fill="${INK}"/><circle cx="74" cy="60" r="3.6" fill="${INK}"/>`,
  happy: `<path d="M50 61q4-5 8 0M70 61q4-5 8 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  wink: `<circle cx="54" cy="60" r="3.6" fill="${INK}"/><path d="M70 61q4-5 8 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  sleepy: `<path d="M50 61h8M70 61h8" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  stars: `<path d="M54 54l1.8 3.9 4.2.5-3.1 2.9.8 4.2-3.7-2.1-3.7 2.1.8-4.2-3.1-2.9 4.2-.5z" fill="${GOLD}"/><path d="M74 54l1.8 3.9 4.2.5-3.1 2.9.8 4.2-3.7-2.1-3.7 2.1.8-4.2-3.1-2.9 4.2-.5z" fill="${GOLD}"/>`,
};

const mouthSvg: Record<AvatarConfig["mouth"], string> = {
  smile: `<path d="M56 71q8 7 16 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  grin: `<path d="M54 69h20q0 11-10 11t-10-11z" fill="${INK}"/><path d="M58 76q6 4 12 0v4h-12z" fill="${ROSE}"/>`,
  tongue: `<path d="M56 70q8 7 16 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M63 74h7v4a3.5 3.5 0 0 1-7 0z" fill="${ROSE}"/>`,
  oh: `<ellipse cx="64" cy="74" rx="4" ry="5" fill="${INK}"/>`,
  flat: `<path d="M57 73h14" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
};

const hairBack: Partial<Record<AvatarConfig["hair"], (h: string) => string>> = {
  long: (h) => `<path d="M32 64q0-36 32-36t32 36v38q-8 6-14 0V74H46v28q-6 6-14 0z" fill="${h}"/>`,
  bob: (h) => `<path d="M33 66q-2-38 31-38t31 38v12q-6 6-12 0V68H45v10q-6 6-12 0z" fill="${h}"/>`,
  tresses: (h) => `<path d="M34 62q-6 20 0 44h9q-6-24-2-44zM94 62q6 20 0 44h-9q6-24 2-44z" fill="${h}"/><circle cx="38" cy="108" r="5" fill="${ROSE}"/><circle cx="90" cy="108" r="5" fill="${ROSE}"/>`,
  afro: (h) => `<circle cx="64" cy="50" r="38" fill="${h}"/>`,
  bun: (h) => `<circle cx="64" cy="24" r="11" fill="${h}"/>`,
  ponytail: (h) => `<path d="M90 50q22 4 16 38q-4-20-22-26z" fill="${h}"/>`,
  boucles: (h) => `<g fill="${h}"><circle cx="40" cy="62" r="11"/><circle cx="88" cy="62" r="11"/><circle cx="44" cy="46" r="12"/><circle cx="84" cy="46" r="12"/></g>`,
};

const hairFront: Partial<Record<AvatarConfig["hair"], (h: string) => string>> = {
  court: (h) => `<path d="M34 58q0-28 30-28t30 28q-8-9-19-10-10 4-22 2-14 2-19 8z" fill="${h}"/>`,
  rase: (h) => `<path d="M36 52q2-20 28-20t28 20q-14-9-28-9t-28 9z" fill="${h}"/>`,
  raie: (h) => `<path d="M33 60q0-30 31-30 26 0 31 30-10-14-26-17-18 5-36 17z" fill="${h}"/>`,
  long: (h) => `<path d="M34 60q2-30 30-30t30 30q-10-16-30-14t-30 14z" fill="${h}"/>`,
  bob: (h) => `<path d="M35 58q4-28 29-28t29 28q-14-8-29-8t-29 8z" fill="${h}"/>`,
  tresses: (h) => `<path d="M34 60q2-30 30-30t30 30q-10-16-30-14t-30 14z" fill="${h}"/>`,
  bun: (h) => `<path d="M34 58q2-28 30-28t30 28q-12-12-30-12t-30 12z" fill="${h}"/>`,
  ponytail: (h) => `<path d="M34 58q0-28 30-28t30 28q-8-10-18-11-10 5-22 3-14 2-20 8z" fill="${h}"/>`,
  boucles: (h) => `<g fill="${h}"><circle cx="46" cy="38" r="10"/><circle cx="60" cy="33" r="10"/><circle cx="74" cy="33" r="10"/><circle cx="86" cy="40" r="10"/></g>`,
  crete: (h) => `<path d="M56 36l4-14 4 10 4-12 4 14z" fill="${h}"/><path d="M40 52q4-12 24-12t24 12q-12-6-24-6t-24 6z" fill="${h}"/>`,
};

const facialSvg = (kind: AvatarConfig["facial"], h: string): string => {
  if (kind === "beard") return `<path d="M37 68q0 26 27 26t27-26q-6 14-27 14t-27-14z" fill="${h}"/>`;
  if (kind === "mustache") return `<path d="M64 70q-6-5-13 0 4 7 13 5 9 2 13-5-7-5-13 0z" fill="${h}"/>`;
  return "";
};

const glassesSvg: Record<AvatarConfig["glasses"], string> = {
  none: "",
  round: `<circle cx="54" cy="60" r="8" fill="none" stroke="${INK}" stroke-width="2.6"/><circle cx="74" cy="60" r="8" fill="none" stroke="${INK}" stroke-width="2.6"/><path d="M62 60h4" stroke="${INK}" stroke-width="2.6"/>`,
  sun: `<rect x="44" y="53" width="18" height="13" rx="5" fill="${INK}"/><rect x="66" y="53" width="18" height="13" rx="5" fill="${INK}"/><path d="M62 58h4" stroke="${INK}" stroke-width="3"/><path d="M47 56h5" stroke="${WHITE}" stroke-width="2" stroke-linecap="round" opacity=".6"/>`,
};

const hatSvg: Record<AvatarConfig["hat"], string> = {
  none: "",
  beanie: `<path d="M35 52q0-28 29-28t29 28z" fill="${NIGHT}"/><rect x="33" y="44" width="62" height="10" rx="5" fill="#3D8B7D"/><circle cx="64" cy="20" r="7" fill="${WHITE}"/>`,
  cap: `<path d="M36 50q0-24 28-24t28 24z" fill="#D99C82"/><path d="M84 46q14 0 18 6l-18 2z" fill="#D99C82"/><circle cx="64" cy="27" r="3" fill="${INK}"/>`,
  bucket: `<path d="M40 44q2-20 24-20t24 20z" fill="${WHITE}"/><path d="M30 46q34-8 68 0l-4 6q-30-6-60 0z" fill="${WHITE}"/><path d="M41 42h46" stroke="#D99C82" stroke-width="4"/>`,
  beret: `<ellipse cx="60" cy="36" rx="30" ry="11" fill="${INK}" transform="rotate(-10 60 36)"/><path d="M62 24v-6" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  cowboy: `<path d="M38 46q2-20 26-20t26 20z" fill="#8A5A3B"/><path d="M22 48q42-14 84 0-10 8-42 8T22 48z" fill="#8A5A3B"/><path d="M40 44h48" stroke="${INK}" stroke-width="4"/>`,
  crown: `<path d="M42 40l4-14 9 9 9-13 9 13 9-9 4 14z" fill="${GOLD}"/>`,
  viking: `<path d="M36 52q0-24 28-24t28 24z" fill="#9AA0AC"/><path d="M36 50q-14-2-14-18 8 10 16 12zM92 50q14-2 14-18-8 10-16 12z" fill="${WHITE}"/>`,
  wizard: `<path d="M40 44L64 6l24 38z" fill="#4A5A9A"/><path d="M32 46q32-10 64 0-8 6-32 6t-32-6z" fill="#4A5A9A"/><circle cx="64" cy="26" r="3" fill="${GOLD}"/><circle cx="56" cy="38" r="2" fill="${GOLD}"/>`,
  chef: `<path d="M42 40h44v-8a10 10 0 0 0-6-18 12 12 0 0 0-16-4 12 12 0 0 0-16 4 10 10 0 0 0-6 18z" fill="${WHITE}"/><rect x="42" y="34" width="44" height="10" rx="3" fill="${WHITE}" stroke="${SAND}" stroke-width="2"/>`,
};

const maskSvg: Record<AvatarConfig["mask"], { under: string; over: string }> = {
  none: { under: "", over: "" },
  justicier: {
    under: `<path d="M42 40l3-20 13 12zM86 40l-3-20-13 12z" fill="#2B2F3A"/>`,
    over: `<path d="M34 64q0-34 30-34t30 34q-4-6-12-7-6 8-18 8t-18-8q-8 1-12 7z" fill="#2B2F3A"/><path d="M45 57l10 3-10 3zM83 57l-10 3 10 3z" fill="${WHITE}"/>`,
  },
  diving: {
    under: "",
    over: `<rect x="40" y="49" width="48" height="22" rx="11" fill="${WHITE}" fill-opacity=".45" stroke="${INK}" stroke-width="3"/><path d="M90 76v-34q0-6 6-6" stroke="${GOLD}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  },
};

const pick = <T,>(list: readonly T[], i: number): T => list[((i % list.length) + list.length) % list.length];

export function normalizeConfig(input: Partial<AvatarConfig> | null | undefined): AvatarConfig {
  const c = { ...DEFAULT_AVATAR, ...(input ?? {}) };
  return {
    skin: Math.abs(Math.trunc(Number(c.skin) || 0)) % SKINS.length,
    hairColor: Math.abs(Math.trunc(Number(c.hairColor) || 0)) % HAIR_COLORS.length,
    bg: Math.abs(Math.trunc(Number(c.bg) || 0)) % BACKGROUNDS.length,
    hair: HAIR_STYLES.includes(c.hair) ? c.hair : DEFAULT_AVATAR.hair,
    eyes: EYES.includes(c.eyes) ? c.eyes : DEFAULT_AVATAR.eyes,
    mouth: MOUTHS.includes(c.mouth) ? c.mouth : DEFAULT_AVATAR.mouth,
    facial: FACIAL.includes(c.facial) ? c.facial : "none",
    glasses: GLASSES.includes(c.glasses) ? c.glasses : "none",
    hat: HATS.includes(c.hat) ? c.hat : "none",
    mask: MASKS.includes(c.mask) ? c.mask : "none",
  };
}

export function avatarSvg(input: Partial<AvatarConfig>): string {
  const c = normalizeConfig(input);
  const skin = SKINS[c.skin];
  const hair = HAIR_COLORS[c.hairColor];
  const bg = BACKGROUNDS[c.bg];
  const shirt = pick(SHIRTS, c.bg + c.skin);
  const mask = maskSvg[c.mask];
  const cheeks = `<circle cx="47" cy="70" r="4.5" fill="${ROSE}" opacity=".45"/><circle cx="81" cy="70" r="4.5" fill="${ROSE}" opacity=".45"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><!--cfg:${JSON.stringify(c)}-->` +
    `<rect width="128" height="128" fill="${bg}"/>` +
    `<path d="M22 128c0-24 18-36 42-36s42 12 42 36z" fill="${shirt}"/>` +
    (hairBack[c.hair]?.(hair) ?? "") +
    mask.under +
    `<circle cx="64" cy="62" r="30" fill="${skin}"/>` +
    cheeks +
    eyesSvg[c.eyes] +
    mouthSvg[c.mouth] +
    facialSvg(c.facial, hair) +
    (hairFront[c.hair]?.(hair) ?? "") +
    mask.over +
    glassesSvg[c.glasses] +
    hatSvg[c.hat] +
    `</svg>`
  );
}

const DATA_PREFIX = "data:image/svg+xml;charset=utf-8,";

/** URL de données prête à enregistrer comme avatar. */
export function avatarDataUrl(config: Partial<AvatarConfig>): string {
  return DATA_PREFIX + encodeURIComponent(avatarSvg(config));
}

export function isBuiltAvatar(value: string | null | undefined): value is string {
  return !!value && value.startsWith(DATA_PREFIX);
}

/** Relit la configuration d'un avatar créé ici (null pour une photo ou un ancien avatar). */
export function parseAvatarConfig(value: string | null | undefined): AvatarConfig | null {
  if (!isBuiltAvatar(value)) return null;
  try {
    const svg = decodeURIComponent(value.slice(DATA_PREFIX.length));
    const m = svg.match(/<!--cfg:(\{.*?\})-->/);
    return m ? normalizeConfig(JSON.parse(m[1]) as Partial<AvatarConfig>) : null;
  } catch {
    return null;
  }
}

function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  return () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return h / 4294967296;
  };
}

/** Configuration tirée au hasard (reproductible avec une graine). */
export function randomConfig(seed?: string): AvatarConfig {
  const rnd = seed ? seeded(seed) : Math.random;
  const any = <T,>(list: readonly T[]): T => list[Math.floor(rnd() * list.length)];
  const chance = (p: number) => rnd() < p;
  return normalizeConfig({
    skin: Math.floor(rnd() * SKINS.length),
    hair: any(HAIR_STYLES),
    hairColor: Math.floor(rnd() * HAIR_COLORS.length),
    eyes: any(EYES),
    mouth: any(MOUTHS),
    facial: chance(0.2) ? any(["beard", "mustache"] as const) : "none",
    glasses: chance(0.3) ? any(["round", "sun"] as const) : "none",
    hat: chance(0.3) ? any(HATS.filter((h) => h !== "none")) : "none",
    mask: "none",
    bg: Math.floor(rnd() * BACKGROUNDS.length),
  });
}
