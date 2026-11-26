"use client";

import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { VoyouLogo } from "@/components/layout/VoyouLogo";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const scrolled = useScrolled(4);
  return (
    <header
      className={cn(
        "sticky top-0 z-30 transition-[background-color,border-color] duration-300",
        scrolled
          ? "border-b border-border bg-background/85 backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent bg-background"
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5 lg:max-w-5xl lg:px-8">
        <Link href="/trips" aria-label="Accueil Voyou" className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <VoyouLogo size={32} wordmark />
        </Link>
        <UserMenu />
      </div>
    </header>
  );
}
