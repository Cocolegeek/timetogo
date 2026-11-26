"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, Shield } from "lucide-react";
import { m as motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bootInitial } from "@/lib/boot";

function ConsentContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect_to");
  const safeRedirect =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/trips";

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
      window.location.href = safeRedirect;
    } catch (e) {
      console.error("[consent] catch", e);
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <motion.div
        initial={bootInitial({ opacity: 0, y: 16 })}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-6"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 3.5rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
        }}
      >
        <span className="flex size-14 items-center justify-center rounded-[1.1rem] bg-primary text-primary-foreground shadow-section">
          <Shield size={26} />
        </span>
        <h1 className="mt-6 font-display text-[2.25rem] leading-[1.05] font-extrabold tracking-[-0.03em]">
          Tes données restent les tiennes.
        </h1>
        <div className="mt-4 space-y-3 text-[0.98rem] leading-relaxed text-muted-foreground">
          <p>
            Pour fonctionner, Voyou utilise ton nom, ton adresse e-mail et les infos de groupe que tu crées.
          </p>
          <p>
            Elles sont stockées de façon sécurisée et ne sont{" "}
            <span className="font-semibold text-foreground">jamais vendues ni exploitées</span> à des fins commerciales ou publicitaires.
          </p>
          <p>Tu peux demander leur suppression à tout moment depuis les réglages.</p>
        </div>

        <div className="mt-auto space-y-4 pt-8">
          <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => setChecked((v) => !v)}
            className="flex w-full items-start gap-3 rounded-[1.25rem] bg-card p-4 text-left shadow-card"
          >
            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                checked ? "border-primary bg-primary text-primary-foreground" : "border-foreground/25"
              )}
            >
              {checked && <Check size={15} strokeWidth={3} />}
            </span>
            <span className="text-[0.95rem] leading-snug">
              J&apos;ai lu et j&apos;accepte que mes données personnelles soient traitées conformément à la politique de confidentialité.
            </span>
          </button>

          <p className="text-center text-sm">
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
              Lire la politique de confidentialité
            </a>
          </p>

          {error && <p className="text-center text-sm text-red-400">Une erreur est survenue, réessaie.</p>}

          <Button size="lg" onClick={handleAccept} disabled={!checked || loading} className="w-full shadow-section disabled:shadow-none">
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Continuer"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={null}>
      <ConsentContent />
    </Suspense>
  );
}
