"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CreateWizard } from "@/components/trips/CreateWizard";
import { ClientOnly } from "@/components/shared/ClientOnly";
import { PageSkeleton } from "@/components/shared/Skeleton";

const ICON_BTN =
  "flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[0.06] outline-none focus-visible:ring-2 focus-visible:ring-ring";

function NewTripPageContent() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-14 max-w-xl items-center gap-1 px-2">
          <Link href="/trips" className={ICON_BTN} aria-label="Retour">
            <ChevronLeft size={24} strokeWidth={2.2} />
          </Link>
          <p className="font-display text-[1.05rem] font-bold tracking-tight">Nouveau</p>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-5 pt-1 pb-10">
        <CreateWizard />
      </main>
    </div>
  );
}

export default function NewTripPage() {
  return (
    <ClientOnly fallback={<div className="mx-auto max-w-3xl px-5 pt-16"><PageSkeleton /></div>}>
      <NewTripPageContent />
    </ClientOnly>
  );
}
