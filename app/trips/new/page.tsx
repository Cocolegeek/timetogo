"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { TripWizard } from "@/components/trips/TripWizard";
import { GroupWizard } from "@/components/trips/GroupWizard";
import { TripCover } from "@/components/trips/TripCover";
import { PageHeader } from "@/components/layout/PageHeader";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { EASE_OUT } from "@/lib/motion";
import type { TripType } from "@/types";

const TYPE_OPTIONS: {
  type: TripType;
  title: string;
  description: string;
  cover: number;
}[] = [
  {
    type: "trip",
    title: "Un voyage",
    description: "Destination, dates, planning jour par jour, menus et budget partagé.",
    cover: 1,
  },
  {
    type: "group",
    title: "Un groupe",
    description: "Juste un budget partagé : coloc, anniv, week-end, soirée…",
    cover: 4,
  },
];

const ICON_BTN =
  "flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[0.06] outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function NewTripPage() {
  const [chosen, setChosen] = useState<TripType | null>(null);

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-14 max-w-xl items-center gap-1 px-2">
          {chosen ? (
            <button type="button" onClick={() => setChosen(null)} className={ICON_BTN} aria-label="Retour au choix">
              <ChevronLeft size={24} strokeWidth={2.2} />
            </button>
          ) : (
            <Link href="/trips" className={ICON_BTN} aria-label="Retour aux voyages">
              <ChevronLeft size={24} strokeWidth={2.2} />
            </Link>
          )}
          {chosen && (
            <p className="font-display text-[1.05rem] font-bold tracking-tight">
              {chosen === "trip" ? "Nouveau voyage" : "Nouveau groupe"}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-xl px-5 pt-1 pb-10">
        <AnimatePresence mode="wait" initial={false}>
          {!chosen ? (
            <motion.div
              key="choose"
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
            >
              <Stagger step={0.07} className="space-y-5">
                <StaggerItem>
                  <PageHeader title="On crée quoi ?" subtitle="Tu pourras tout modifier plus tard." />
                </StaggerItem>
                {TYPE_OPTIONS.map((opt) => (
                  <StaggerItem key={opt.type}>
                    <button
                      type="button"
                      onClick={() => setChosen(opt.type)}
                      className="group pressable block w-full overflow-hidden rounded-[1.75rem] bg-card text-left shadow-raised outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <TripCover
                        seed={opt.type}
                        variant={opt.cover}
                        className="h-36 transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.03]"
                      />
                      <span className="flex items-center gap-4 p-5">
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-[1.35rem] font-bold tracking-tight">{opt.title}</span>
                          <span className="mt-0.5 block text-[0.95rem] text-muted-foreground">{opt.description}</span>
                        </span>
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 group-hover:translate-x-0.5">
                          <ArrowRight size={20} />
                        </span>
                      </span>
                    </button>
                  </StaggerItem>
                ))}
              </Stagger>
            </motion.div>
          ) : (
            <motion.div
              key={chosen}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.32, ease: EASE_OUT }}
            >
              {chosen === "trip" ? <TripWizard /> : <GroupWizard />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
