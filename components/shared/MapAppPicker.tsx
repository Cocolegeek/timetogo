"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ChevronRight } from "lucide-react";
import {
  GoogleMapsIcon,
  WazeIcon,
  AppleMapsIcon,
  CityMapperIcon,
} from "@/components/shared/MapAppIcons";
import type { MapAppId } from "@/lib/map-apps";
import type { JourneyMode } from "@/types";

type Coord = { lat: number; lon: number };

export interface OpenLocationOptions {
  /** Reorders the picker to put the most relevant apps first */
  mode?: JourneyMode;
}

interface MapAppApi {
  openLocation: (q: string, options?: OpenLocationOptions) => void;
  openRoute: (from: string, to: string, options?: OpenLocationOptions) => void;
}

const MapAppPickerContext = createContext<MapAppApi>({
  openLocation: () => {},
  openRoute: () => {},
});

export function useOpenLocation() {
  return useContext(MapAppPickerContext).openLocation;
}

export function useOpenRoute() {
  return useContext(MapAppPickerContext).openRoute;
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

function isIosUA(): boolean {
  return (
    typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent)
  );
}

function buildLocationUrl(appId: MapAppId, query: string, coord?: Coord): string {
  const q = encodeURIComponent(query);
  switch (appId) {
    case "google":
      if (coord) return `https://maps.google.com/?q=${coord.lat},${coord.lon}`;
      return `https://maps.google.com/?q=${q}`;
    case "apple":
      if (coord) {
        const base = isIosUA() ? "maps://" : "https://maps.apple.com/";
        return `${base}?ll=${coord.lat},${coord.lon}&q=${q}`;
      }
      return isIosUA() ? `maps://?q=${q}` : `https://maps.apple.com/?q=${q}`;
    case "waze":
      if (coord) return `https://waze.com/ul?ll=${coord.lat},${coord.lon}&navigate=yes`;
      return `https://waze.com/ul?q=${q}&navigate=yes`;
    case "citymapper":
      if (coord)
        return `https://citymapper.com/directions?endcoord=${coord.lat},${coord.lon}&endname=${q}`;
      return `https://citymapper.com/directions?endaddress=${q}&endname=${q}`;
  }
}

function buildRouteUrl(
  appId: MapAppId,
  from: string,
  to: string,
  fromCoord: Coord | null,
  toCoord: Coord | null,
  mode?: JourneyMode
): string {
  const fromQ = fromCoord ? `${fromCoord.lat},${fromCoord.lon}` : from;
  const toQ = toCoord ? `${toCoord.lat},${toCoord.lon}` : to;
  switch (appId) {
    case "google": {
      const travelmode =
        mode === "foot" ? "walking"
        : mode === "bike" ? "bicycling"
        : mode === "transit" ? "transit"
        : "driving";
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(fromQ)}&destination=${encodeURIComponent(toQ)}&travelmode=${travelmode}`;
    }
    case "apple": {
      const dirflg =
        mode === "foot" || mode === "bike" ? "w"
        : mode === "transit" ? "r"
        : "d";
      const base = isIosUA() ? "maps://" : "https://maps.apple.com/";
      return `${base}?saddr=${encodeURIComponent(fromQ)}&daddr=${encodeURIComponent(toQ)}&dirflg=${dirflg}`;
    }
    case "waze":
      // Waze always routes from current GPS; we can only pass destination.
      if (toCoord) return `https://waze.com/ul?ll=${toCoord.lat},${toCoord.lon}&navigate=yes`;
      return `https://waze.com/ul?q=${encodeURIComponent(to)}&navigate=yes`;
    case "citymapper":
      return `https://citymapper.com/directions?startaddress=${encodeURIComponent(from)}&startname=${encodeURIComponent(from)}&endaddress=${encodeURIComponent(to)}&endname=${encodeURIComponent(to)}`;
  }
}

interface AppDef {
  id: MapAppId;
  name: string;
  description: string;
  Icon: React.ComponentType<{ size?: number }>;
}

const APPS: AppDef[] = [
  { id: "google",     name: "Google Maps", description: "Ouvrir dans Google Maps",            Icon: GoogleMapsIcon  },
  { id: "citymapper", name: "CityMapper",  description: "Transports en commun & multimodal",  Icon: CityMapperIcon  },
  { id: "waze",       name: "Waze",        description: "Navigation communautaire (via GPS)", Icon: WazeIcon        },
  { id: "apple",      name: "Plans",       description: "Ouvrir dans Plans (Apple)",          Icon: AppleMapsIcon   },
];

const PREFERRED_BY_MODE: Partial<Record<JourneyMode, MapAppId[]>> = {
  car: ["google", "waze"],
  transit: ["citymapper", "google"],
  foot: ["google", "apple"],
  bike: ["google", "apple"],
};

function orderApps(mode?: JourneyMode): AppDef[] {
  if (!mode) return APPS;
  const preferred = PREFERRED_BY_MODE[mode];
  if (!preferred) return APPS;
  const head = preferred
    .map((id) => APPS.find((a) => a.id === id))
    .filter((a): a is AppDef => !!a);
  const tail = APPS.filter((a) => !preferred.includes(a.id));
  return [...head, ...tail];
}

type PickerState =
  | { kind: "location"; query: string; mode?: JourneyMode }
  | { kind: "route"; from: string; to: string; mode?: JourneyMode };

export function MapAppPickerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PickerState | null>(null);
  const [coord, setCoord] = useState<Coord | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ from: Coord | null; to: Coord | null }>({
    from: null,
    to: null,
  });

  const openLocation = useCallback((q: string, options?: OpenLocationOptions) => {
    setState({ kind: "location", query: q, mode: options?.mode });
  }, []);

  const openRoute = useCallback(
    (from: string, to: string, options?: OpenLocationOptions) => {
      setState({ kind: "route", from, to, mode: options?.mode });
    },
    []
  );

  // Geocode based on state
  useEffect(() => {
    if (!state) {
      setCoord(null);
      setRouteCoords({ from: null, to: null });
      return;
    }
    let cancelled = false;
    if (state.kind === "location") {
      geocodeQuery(state.query).then((c) => { if (!cancelled) setCoord(c); });
    } else {
      Promise.all([geocodeQuery(state.from), geocodeQuery(state.to)]).then(
        ([f, t]) => { if (!cancelled) setRouteCoords({ from: f, to: t }); }
      );
    }
    return () => { cancelled = true; };
  }, [state]);

  const handlePick = (appId: MapAppId) => {
    if (!state) return;
    const url =
      state.kind === "location"
        ? buildLocationUrl(appId, state.query, coord ?? undefined)
        : buildRouteUrl(
            appId,
            state.from,
            state.to,
            routeCoords.from,
            routeCoords.to,
            state.mode
          );
    window.open(url, "_blank", "noopener,noreferrer");
    setState(null);
  };

  const orderedApps = orderApps(state?.mode);
  const headerLabel =
    state?.kind === "route" ? "Ouvrir l'itinéraire dans…" : "Ouvrir le lieu dans…";
  const subtitle =
    state?.kind === "route"
      ? `${state.from} → ${state.to}`
      : state?.kind === "location"
        ? state.query
        : null;

  return (
    <MapAppPickerContext.Provider value={{ openLocation, openRoute }}>
      {children}
      <Sheet open={state !== null} onOpenChange={(o) => { if (!o) setState(null); }}>
        <SheetContent
          side="bottom"
          className="px-0 pb-0"
        >
          <div className="px-6 pt-8 pr-16 pb-2">
            <SheetTitle>{headerLabel}</SheetTitle>
            {subtitle && <p className="mt-1 truncate text-[0.95rem] text-muted-foreground">{subtitle}</p>}
          </div>

          <div className="space-y-1 px-3 pb-3">
            {orderedApps.map(({ id, name, description, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handlePick(id)}
                className="pressable flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-foreground/[0.04] active:bg-secondary"
              >
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] shadow-card">
                  <Icon size={48} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold">{name}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>

          <div aria-hidden style={{ height: "calc(env(safe-area-inset-bottom) + 0.5rem)" }} />
        </SheetContent>
      </Sheet>
    </MapAppPickerContext.Provider>
  );
}
