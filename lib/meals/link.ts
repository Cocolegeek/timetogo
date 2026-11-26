/** Rend un lien saisi à la main exploitable : « chezlea.fr/menu » devient « https://chezlea.fr/menu ». Null si vide ou invalide. */
export function normalizeLink(input: string): string | null {
  const value = input.trim();
  if (!value || /\s/.test(value)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** « https://www.chezlea.fr/menu » devient « chezlea.fr ». */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
