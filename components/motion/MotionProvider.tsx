"use client";

import { MotionConfig } from "framer-motion";
import { useDevicePref } from "@/lib/device-prefs";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [motion] = useDevicePref("motion");
  return <MotionConfig reducedMotion={motion === "reduced" ? "always" : "user"}>{children}</MotionConfig>;
}
