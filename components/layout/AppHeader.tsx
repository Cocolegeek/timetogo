"use client";

import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { VoyouLogo } from "@/components/layout/VoyouLogo";

export function AppHeader() {
  return (
    <header
      className="sticky top-0 z-30 glass-strong border-b border-foreground/8"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/trips" aria-label="Accueil Voyou">
          <VoyouLogo />
        </Link>
        <UserMenu />
      </div>
    </header>
  );
}
