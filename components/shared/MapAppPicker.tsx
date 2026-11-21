"use client";

import { createContext, useCallback, useContext, useState } from "react";
import dynamic from "next/dynamic";
import { useMountOnce } from "@/hooks/useMountOnce";
import type { JourneyMode } from "@/types";

const MapAppPickerSheet = dynamic(() => import("@/components/shared/MapAppPickerSheet"), { ssr: false });

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

export type PickerState =
  | { kind: "location"; query: string; mode?: JourneyMode }
  | { kind: "route"; from: string; to: string; mode?: JourneyMode };

export function MapAppPickerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PickerState | null>(null);
  const mounted = useMountOnce(state !== null);

  const openLocation = useCallback((q: string, options?: OpenLocationOptions) => {
    setState({ kind: "location", query: q, mode: options?.mode });
  }, []);

  const openRoute = useCallback(
    (from: string, to: string, options?: OpenLocationOptions) => {
      setState({ kind: "route", from, to, mode: options?.mode });
    },
    []
  );

  return (
    <MapAppPickerContext.Provider value={{ openLocation, openRoute }}>
      {children}
      {mounted && <MapAppPickerSheet state={state} onClose={() => setState(null)} />}
    </MapAppPickerContext.Provider>
  );
}
