"use client";

import { useState } from "react";
import { AnimatePresence, m as motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface StartStep {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  onClick: () => void;
}

const storageKey = (tripId: string) => `voyou-start-hidden-${tripId}`;

function readHidden(tripId: string): boolean {
  try {
    return localStorage.getItem(storageKey(tripId)) === "1";
  } catch {
    return false;
  }
}

/** Progressive onboarding checklist for a fresh trip. Hidden once complete or dismissed. */
export function GettingStarted({ tripId, steps }: { tripId: string; steps: StartStep[] }) {
  const [hidden, setHidden] = useState(() => (typeof window === "undefined" ? false : readHidden(tripId)));
  const doneCount = steps.filter((s) => s.done).length;
  const complete = doneCount === steps.length;

  const hide = () => {
    try {
      localStorage.setItem(storageKey(tripId), "1");
    } catch {
      // storage unavailable: hidden for this visit only
    }
    setHidden(true);
  };

  const pct = steps.length ? doneCount / steps.length : 0;
  const R = 15;
  const C = 2 * Math.PI * R;

  return (
    <AnimatePresence initial={false}>
      {!hidden && !complete && (
        <motion.section
          exit={{ opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.3, ease: EASE_OUT } }}
          className="overflow-hidden rounded-[1.75rem] bg-card shadow-card"
        >
          <div className="flex items-center gap-3 px-5 pt-5 pb-3">
            <svg viewBox="0 0 36 36" className="size-10 shrink-0 -rotate-90" aria-hidden="true">
              <circle cx="18" cy="18" r={R} fill="none" strokeWidth="4" className="stroke-foreground/[0.08]" />
              <motion.circle
                cx="18"
                cy="18"
                r={R}
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                className="stroke-primary"
                strokeDasharray={C}
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: C * (1 - pct) }}
                transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.2 }}
              />
            </svg>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[1.15rem] font-bold tracking-tight">Premiers pas</h2>
              <p className="text-sm text-muted-foreground">
                {doneCount} sur {steps.length} terminées
              </p>
            </div>
            <button type="button" onClick={hide} className="h-9 shrink-0 rounded-full px-3 text-sm font-semibold text-muted-foreground hover:bg-foreground/[0.06]">
              Masquer
            </button>
          </div>
          <ul className="px-2 pb-2">
            {steps.filter((step) => !step.done).map((step) => (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={step.onClick}
                  disabled={step.done}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors enabled:hover:bg-foreground/[0.04] enabled:active:bg-secondary"
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      step.done ? "border-primary bg-primary text-primary-foreground" : "border-foreground/20"
                    )}
                  >
                    {step.done && <Check size={15} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block font-semibold", step.done && "text-muted-foreground line-through decoration-2")}>{step.label}</span>
                    {!step.done && <span className="block text-sm text-muted-foreground">{step.hint}</span>}
                  </span>
                  {!step.done && <ChevronRight size={18} className="shrink-0 text-muted-foreground" />}
                </button>
              </li>
            ))}
          </ul>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
