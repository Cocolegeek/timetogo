"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";

const OnboardingModal = dynamic(
  () => import("@/components/trips/OnboardingModal").then((m) => ({ default: m.OnboardingModal })),
  { ssr: false }
);

function welcomedOnThisDevice(): boolean {
  try {
    return !!localStorage.getItem("voyou-welcomed-v1");
  } catch {
    return true;
  }
}

/**
 * The first-run flow (welcome + avatar picker + photo crop) only loads when it
 * has something to show, not on every launch.
 */
export function LazyOnboarding() {
  const { profile } = useProfile();
  const [welcomed] = useState(welcomedOnThisDevice);
  const needed = !!profile && (!welcomed || !profile.custom_avatar_url);
  return needed ? <OnboardingModal /> : null;
}
