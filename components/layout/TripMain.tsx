"use client";

import { usePathname } from "next/navigation";
import { contentWidth } from "@/lib/trip-sections";
import { cn } from "@/lib/utils";

/** Zone de contenu d'un voyage : colonne de lecture, ou deux colonnes sur grand écran pour le Résumé. */
export function TripMain({ tripId, children }: { tripId: string; children: React.ReactNode }) {
  const wide = contentWidth(usePathname(), `/trips/${tripId}`) === "wide";
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-3xl flex-1 px-4 pt-1 pb-[calc(var(--bottom-nav-top)+2rem)] lg:px-8 lg:pb-12",
        wide && "lg:max-w-5xl"
      )}
    >
      {children}
    </main>
  );
}
