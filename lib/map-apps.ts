export type MapAppId = "google" | "apple" | "waze" | "citymapper";

export const MAP_APPS: { id: MapAppId; name: string; emoji: string }[] = [
  { id: "google", name: "Google Maps", emoji: "🗺️" },
  { id: "apple", name: "Plans", emoji: "🍎" },
  { id: "waze", name: "Waze", emoji: "🚗" },
  { id: "citymapper", name: "CityMapper", emoji: "🚇" },
];

export const MAP_PREF_KEY = "preferred-map-app";

function buildMapUrl(appId: MapAppId, query: string): string {
  const q = encodeURIComponent(query);
  const isIos =
    typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  switch (appId) {
    case "google":
      return `https://maps.google.com/?q=${q}`;
    case "apple":
      return isIos ? `maps://?q=${q}` : `https://maps.apple.com/?q=${q}`;
    case "waze":
      return `https://waze.com/ul?q=${q}&navigate=yes`;
    case "citymapper":
      return `https://citymapper.com/directions?endaddress=${q}&endname=${q}`;
  }
}

export function openLocation(query: string): void {
  const stored =
    typeof localStorage !== "undefined"
      ? (localStorage.getItem(MAP_PREF_KEY) as MapAppId | null)
      : null;
  const url = buildMapUrl(stored ?? "google", query);
  window.open(url, "_blank", "noopener,noreferrer");
}
