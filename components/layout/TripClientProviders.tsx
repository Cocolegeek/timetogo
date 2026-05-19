"use client";

import { MapAppPickerProvider } from "@/components/shared/MapAppPicker";

export function TripClientProviders({ children }: { children: React.ReactNode }) {
  return <MapAppPickerProvider>{children}</MapAppPickerProvider>;
}
