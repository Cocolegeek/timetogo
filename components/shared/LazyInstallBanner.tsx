"use client";

import dynamic from "next/dynamic";

// The install hint only matters on some visits: keep its code out of the launch.
export const LazyInstallBanner = dynamic(
  () => import("@/components/shared/IosInstallBanner").then((m) => ({ default: m.AppInstallBanner })),
  { ssr: false }
);
