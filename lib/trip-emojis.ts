export const THEME_EMOJIS = ["🚆", "🏖️", "🏔️", "🗺️", "🌍", "🎒", "🏕️", "🚢"];

export const POPULAR_FLAG_CODES = [
  "FR", "IT", "ES", "PT", "GR", "HR", "DE", "GB", "IE", "NL", "BE", "CH", "AT",
  "US", "CA", "MX", "BR", "JP", "TH", "VN", "MA", "TN", "EG", "TR", "IS", "NO",
];

const REGIONAL_A = 0x1f1e6;

export function flagEmoji(countryCode: string | null | undefined): string | null {
  const code = (countryCode ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return String.fromCodePoint(...[...code].map((c) => REGIONAL_A + c.charCodeAt(0) - 65));
}

export function isFlagEmoji(value: string): boolean {
  return /^[\u{1F1E6}-\u{1F1FF}]{2}$/u.test(value);
}

export const POPULAR_FLAGS = POPULAR_FLAG_CODES.map((c) => flagEmoji(c) as string);

export function tripEmojiChoices(detectedCountry?: string | null): string[] {
  const detected = flagEmoji(detectedCountry);
  return [...new Set([...(detected ? [detected] : []), ...THEME_EMOJIS, ...POPULAR_FLAGS])];
}
