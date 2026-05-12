"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/layout/GlassCard";
import { MeshGradientBackground } from "@/components/layout/MeshGradientBackground";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ConsentPage() {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleAccept = async () => {
    if (!checked || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/consent", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        console.error("[consent]", res.status, body);
        throw new Error(body?.error ?? "unknown");
      }
      window.location.href = "/trips";
    } catch (e) {
      console.error("[consent] catch", e);
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <MeshGradientBackground />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <GlassCard className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-section-soft flex items-center justify-center shrink-0">
              <Shield size={20} className="text-section" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">Confidentialité</h1>
              <p className="text-xs text-slate-500">Requis une seule fois</p>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-3 text-sm text-slate-400 leading-relaxed">
            <p>
              Pour utiliser Voyou, nous traitons certaines de tes données
              personnelles : ton nom, ton adresse e-mail et les informations de
              voyage que tu crées.
            </p>
            <p>
              Ces données sont stockées de façon sécurisée et ne sont{" "}
              <span className="text-slate-200 font-medium">
                jamais vendues ni exploitées
              </span>{" "}
              à des fins commerciales ou publicitaires.
            </p>
            <p>
              Tu peux demander la suppression de tes données à tout moment
              depuis les paramètres de l'application.
            </p>
          </div>

          {/* Checkbox */}
          <button
            type="button"
            onClick={() => setChecked((v) => !v)}
            className="w-full flex items-start gap-3 text-left group"
          >
            <div className="mt-0.5 shrink-0">
              <div
                className={cn(
                  "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                  checked
                    ? "border-section bg-section"
                    : "border-slate-600 group-hover:border-slate-400"
                )}
              >
                {checked && (
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8l3 3 7-7"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-slate-300 leading-snug">
              J'ai lu et j'accepte que mes données personnelles soient traitées
              conformément à la politique de confidentialité.
            </span>
          </button>

          {error && (
            <p className="text-xs text-red-400 text-center">
              Une erreur est survenue, réessaie.
            </p>
          )}

          {/* CTA */}
          <Button
            onClick={handleAccept}
            disabled={!checked || loading}
            className="w-full gradient-primary text-white border-0 py-5 text-sm font-semibold disabled:opacity-40"
          >
            {loading ? "…" : "Continuer vers l'application"}
          </Button>
        </GlassCard>
      </motion.div>
    </div>
  );
}
