"use client";

import { useState } from "react";
import { CloudUpload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { useToast } from "@/components/shared/Toaster";
import { startGoogleUpgrade } from "@/lib/auth/guest";
import { cn } from "@/lib/utils";

/** Nudge shown to guests: save everything to a Google account, nothing is lost. */
export function GuestUpgradeCard({ className, compact = false }: { className?: string; compact?: boolean }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const upgrade = async () => {
    setLoading(true);
    const { error } = await startGoogleUpgrade();
    if (error) {
      setLoading(false);
      toast({ message: "Impossible de lancer la sauvegarde. Réessaie.", tone: "error" });
    }
  };

  return (
    <section className={cn("rounded-[1.5rem] bg-card p-5 shadow-card", className)}>
      <div className="flex items-start gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-foreground/[0.06]">
          <CloudUpload size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[1.05rem] font-bold tracking-tight">Tu es en mode invité</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {compact
              ? "Sauvegarde tes voyages pour les retrouver partout."
              : "Tes voyages ne sont que sur cet appareil. Relie ton compte Google pour les garder et les retrouver partout, sans rien perdre."}
          </p>
        </div>
      </div>
      <Button variant="secondary" size="lg" onClick={upgrade} disabled={loading} className="mt-4 w-full">
        {loading ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
        Sauvegarder avec Google
      </Button>
    </section>
  );
}
