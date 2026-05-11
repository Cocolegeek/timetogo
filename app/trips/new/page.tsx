"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Compass, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { GlassCard } from "@/components/layout/GlassCard";
import { TripWizard } from "@/components/trips/TripWizard";
import { GroupWizard } from "@/components/trips/GroupWizard";
import { cn } from "@/lib/utils";
import type { TripType } from "@/types";

const TYPE_OPTIONS: {
  type: TripType;
  title: string;
  description: string;
  icon: typeof Compass;
  accent: string;
}[] = [
  {
    type: "trip",
    title: "Voyage",
    description: "Destination, dates, planning, menus et budget partagé",
    icon: Compass,
    accent: "from-violet-500/30 to-indigo-500/15 ring-violet-400/40 text-violet-300",
  },
  {
    type: "group",
    title: "Budget",
    description: "Suivre les dépenses partagées d'un événement (anniv, soirée, coloc…)",
    icon: Wallet,
    accent: "from-indigo-500/30 to-sky-500/15 ring-indigo-400/40 text-indigo-300",
  },
];

export default function NewTripPage() {
  const [chosen, setChosen] = useState<TripType | null>(null);

  return (
    <>
      <MeshGradientBackground />

      <div className="min-h-screen">
        <header className="glass-strong border-b border-foreground/8 sticky top-0 z-40">
          <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
            {chosen ? (
              <button
                onClick={() => setChosen(null)}
                className="p-2 rounded-xl hover:bg-foreground/8 text-slate-400 hover:text-slate-200 transition-all"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <Link
                href="/trips"
                className="p-2 rounded-xl hover:bg-foreground/8 text-slate-400 hover:text-slate-200 transition-all"
              >
                <ArrowLeft size={18} />
              </Link>
            )}
            <h1 className="font-semibold text-slate-100">
              {chosen === "trip"
                ? "Nouveau voyage"
                : chosen === "group"
                  ? "Nouveau budget"
                  : "Que veux-tu créer ?"}
            </h1>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 py-6">
          {!chosen ? (
            <div className="space-y-3">
              <p className="text-base text-slate-400 mb-4 px-1">
                Time to Go peut gérer un voyage complet ou simplement un budget partagé entre amis.
              </p>
              {TYPE_OPTIONS.map((opt, i) => {
                const Icon = opt.icon;
                return (
                  <motion.button
                    key={opt.type}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setChosen(opt.type)}
                    className="w-full text-left active:scale-[0.99] transition-transform"
                  >
                    <GlassCard className="hover:border-foreground/15 transition-colors">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 ring-1",
                            opt.accent
                          )}
                        >
                          <Icon size={26} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-lg font-bold text-slate-100">
                            {opt.title}
                          </h2>
                          <p className="text-sm text-slate-400 leading-snug">
                            {opt.description}
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.button>
                );
              })}
            </div>
          ) : chosen === "trip" ? (
            <TripWizard />
          ) : (
            <GroupWizard />
          )}
        </main>
      </div>
    </>
  );
}
