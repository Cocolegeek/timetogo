"use client";

import { MapAppPickerProvider } from "@/components/shared/MapAppPicker";
import { LazyOnboarding } from "@/components/trips/LazyOnboarding";

export function TripClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <MapAppPickerProvider>
      {children}
      <LazyOnboarding />
    </MapAppPickerProvider>
  );
}
