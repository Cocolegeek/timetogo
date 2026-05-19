"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  GoogleMapsIcon,
  WazeIcon,
  AppleMapsIcon,
  CityMapperIcon,
} from "@/components/shared/MapAppIcons";
import type { MapAppId } from "@/lib/map-apps";

type Coord = { lat: number; lon: number };
type OpenFn = (query: string) => void;

const MapAppPickerContext = createContext<OpenFn>(() => {});

export function useOpenLocation(): OpenFn {
  return useContext(MapAppPickerContext);
}

async function geocodeQuery(query: string): Promise<Coord | null> {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function buildUrl(appId: MapAppId, query: string, coord?: Coord): string {
  const q = encodeURIComponent(query);
  const isIos =
    typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  switch (appId) {
    case "google":
      if (coord) return `https://maps.google.com/?q=${coord.lat},${coord.lon}`;
      return `https://maps.google.com/?q=${q}`;
    case "apple":
      if (coord) {
        const base = isIos ? "maps://" : "https://maps.apple.com/";
        return `${base}?ll=${coord.lat},${coord.lon}&q=${q}`;
      }
      return isIos ? `maps://?q=${q}` : `https://maps.apple.com/?q=${q}`;
    case "waze":
      // Waze always routes from GPS position — destination coord only
      if (coord) return `https://waze.com/ul?ll=${coord.lat},${coord.lon}&navigate=yes`;
      return `https://waze.com/ul?q=${q}&navigate=yes`;
    case "citymapper":
      if (coord) return `https://citymapper.com/directions?endcoord=${coord.lat},${coord.lon}&endname=${q}`;
      return `https://citymapper.com/directions?endaddress=${q}&endname=${q}`;
  }
}

const APPS: {
  id: MapAppId;
  name: string;
  description: string;
  Icon: React.ComponentType<{ size?: number }>;
}[] = [
  { id: "google",     name: "Google Maps", description: "Ouvrir dans Google Maps",              Icon: GoogleMapsIcon  },
  { id: "citymapper", name: "CityMapper",  description: "Transports en commun & multimodal",   Icon: CityMapperIcon  },
  { id: "waze",       name: "Waze",        description: "Navigation communautaire (via GPS)",   Icon: WazeIcon        },
  { id: "apple",      name: "Plans",       description: "Ouvrir dans Plans (Apple)",            Icon: AppleMapsIcon   },
];

export function MapAppPickerProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState<string | null>(null);
  const [coord, setCoord] = useState<Coord | null>(null);

  const open = useCallback((q: string) => setQuery(q), []);

  // Geocode as soon as the picker opens so all apps get coords instantly on tap
  useEffect(() => {
    if (!query) { setCoord(null); return; }
    let cancelled = false;
    geocodeQuery(query).then((c) => { if (!cancelled) setCoord(c); });
    return () => { cancelled = true; };
  }, [query]);

  const handlePick = (appId: MapAppId) => {
    if (!query) return;
    window.open(buildUrl(appId, query, coord ?? undefined), "_blank", "noopener,noreferrer");
    setQuery(null);
  };

  return (
    <MapAppPickerContext.Provider value={open}>
      {children}
      <Sheet open={query !== null} onOpenChange={(o) => !o && setQuery(null)}>
        <SheetContent
          side="bottom"
          className="glass-strong border-foreground/10 rounded-t-2xl px-0 pb-0"
        >
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold text-center">
              Ouvrir le lieu dans…
            </p>
            {query && (
              <p className="text-sm text-slate-300 text-center mt-1 truncate">{query}</p>
            )}
          </div>

          <div className="divide-y divide-foreground/8">
            {APPS.map(({ id, name, description, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handlePick(id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-foreground/6 active:bg-foreground/10 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm p-2.5">
                  <Icon size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-slate-100">{name}</p>
                  <p className="text-sm text-slate-500">{description}</p>
                </div>
              </button>
            ))}
          </div>

          <div aria-hidden style={{ height: "calc(env(safe-area-inset-bottom) + 0.5rem)" }} />
        </SheetContent>
      </Sheet>
    </MapAppPickerContext.Provider>
  );
}
