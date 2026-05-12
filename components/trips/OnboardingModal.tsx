"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Wallet, UtensilsCrossed, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "voyou-welcomed-v1";

const FEATURES = [
  {
    icon: Compass,
    label: "Planifie l'itinéraire jour par jour",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
  },
  {
    icon: Wallet,
    label: "Gère les dépenses en groupe, sans galère",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: UtensilsCrossed,
    label: "Organise les repas et le ravitaillement",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
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
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "oklch(0.05 0.02 260 / 0.85)", backdropFilter: "blur(12px)" }}
            onClick={dismiss}
          />

          {/* Sheet */}
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl"
            style={{ background: "oklch(0.10 0.02 260)" }}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0, transition: { duration: 0.25 } }}
            transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.05 }}
          >
            {/* Gradient top accent */}
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, var(--accent-500), oklch(0.60 0.22 300))",
              }}
            />

            {/* Orb déco */}
            <div
              className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle, var(--accent-500) 0%, transparent 70%)",
                opacity: 0.15,
                filter: "blur(24px)",
              }}
            />

            <div className="relative px-6 pt-8 pb-6 space-y-7">
              {/* Drag handle (mobile) */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/15 sm:hidden" />

              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-center space-y-2"
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-3xl font-black gradient-text tracking-tight">voYou</span>
                  <Sparkles size={22} className="text-amber-300" />
                </div>
                <h2 className="text-2xl font-bold text-white leading-snug">
                  Ton complice de voyage
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Organise. Partage. Profite. Sans prise de tête.
                </p>
              </motion.div>

              {/* Features */}
              <div className="space-y-2.5">
                {FEATURES.map(({ icon: Icon, label, color, bg }, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.08 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/4 border border-white/6"
                  >
                    <div className={`p-2 rounded-xl ${bg} ${color} shrink-0`}>
                      <Icon size={18} />
                    </div>
                    <p className="text-sm text-slate-200 font-medium">{label}</p>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="space-y-3"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
              >
                <Button
                  onClick={dismiss}
                  className="w-full h-13 rounded-2xl gradient-primary text-white font-bold text-base shadow-section-strong active:scale-95 transition-all"
                  size="lg"
                >
                  C&apos;est parti !
                  <ChevronRight size={18} strokeWidth={2.5} />
                </Button>
                <p className="text-center text-xs text-slate-600">
                  voyou.app — fait avec ♥ pour les vrais voyageurs
                </p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
