"use client";

import dynamic from "next/dynamic";
import { MapAppPickerProvider } from "@/components/shared/MapAppPicker";

const OnboardingModal = dynamic(
  () => import("@/components/trips/OnboardingModal").then((m) => ({ default: m.OnboardingModal })),
  { ssr: false }
);

export function TripClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <MapAppPickerProvider>
      {children}
      <OnboardingModal />
    </MapAppPickerProvider>
  );
}
