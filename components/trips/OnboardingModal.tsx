"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, Wallet, UtensilsCrossed, ChevronRight } from "lucide-react";
import { TripCover } from "@/components/trips/TripCover";
import { EASE_SHEET, fadeUp, stagger } from "@/lib/motion";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "voyou-welcomed-v1";

const FEATURES = [
  {
    icon: Map,
    label: "Planifie l'itinéraire jour par jour",
    color: "text-sky-400",
    bg: "bg-sky-500/12",
  },
  {
    icon: Wallet,
    label: "Gère les dépenses en groupe, sans galère",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: UtensilsCrossed,
    label: "Organise les repas et le ravitaillement",
    color: "text-emerald-400",
    bg: "bg-emerald-500/12",
  },
];

export function OnboardingModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-end justify-end sm:items-center sm:justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          <div className="absolute inset-0 bg-black/45 dark:bg-black/65" onClick={dismiss} aria-hidden="true" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            className="relative w-full max-w-md overflow-hidden rounded-t-[1.75rem] bg-popover shadow-float sm:rounded-[1.75rem]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.3, ease: EASE_SHEET } }}
            transition={{ duration: 0.55, ease: EASE_SHEET }}
          >
            <TripCover seed="onboarding" variant={0} className="h-40" />

            <div className="space-y-6 px-6 pt-6 pb-6" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}>
              <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.15 }}>
                <h2 id="onboarding-title" className="font-display text-[1.75rem] leading-tight font-extrabold tracking-tight">
                  Bienvenue sur Voyou
                </h2>
                <p className="mt-1 text-[0.95rem] text-muted-foreground">Organise, partage, profite. Sans prise de tête.</p>
              </motion.div>

              <motion.ul variants={stagger(0.07, 0.25)} initial="hidden" animate="show" className="space-y-3">
                {FEATURES.map(({ icon: Icon, label, color, bg }) => (
                  <motion.li key={label} variants={fadeUp} className="flex items-center gap-3.5">
                    <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${bg} ${color}`}>
                      <Icon size={20} />
                    </span>
                    <span className="text-[0.95rem] font-medium">{label}</span>
                  </motion.li>
                ))}
              </motion.ul>

              <Button onClick={dismiss} size="lg" className="w-full shadow-section">
                C&apos;est parti
                <ChevronRight size={18} strokeWidth={2.5} />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
