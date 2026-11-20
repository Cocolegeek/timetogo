"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClientOnly } from "@/components/shared/ClientOnly";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";

const ICON_BTN =
  "flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[0.06] outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Frame shared by Réglages and its sub-pages: back button, large title, airy column. */
export function SettingsShell({
  title,
  subtitle,
  back = "/settings",
  backLabel = "Retour aux réglages",
  bottomSpace = "2.5rem",
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  back?: string;
  backLabel?: string;
  bottomSpace?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-14 max-w-lg items-center px-2">
          <Link href={back} prefetch className={ICON_BTN} aria-label={backLabel}>
            <ChevronLeft size={24} strokeWidth={2.2} />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-5 pt-1" style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + ${bottomSpace})` }}>
        <ClientOnly fallback={<PageSkeleton />}>
          <Stagger step={0.05} className="space-y-8">
            <StaggerItem>
              <PageHeader title={title} subtitle={subtitle} />
            </StaggerItem>
            {children}
          </Stagger>
        </ClientOnly>
      </main>
    </div>
  );
}
