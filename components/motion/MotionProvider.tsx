"use client";

import { LazyMotion, MotionConfig } from "framer-motion";
import { useDevicePref } from "@/lib/device-prefs";

// Components use the light `m` (imported as `motion`); gestures, drag and layout
// animations arrive in a separate chunk right after the first render.
const loadFeatures = () => import("./features").then((mod) => mod.default);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [motion] = useDevicePref("motion");
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion={motion === "reduced" ? "always" : "user"}>{children}</MotionConfig>
    </LazyMotion>
  );
}
