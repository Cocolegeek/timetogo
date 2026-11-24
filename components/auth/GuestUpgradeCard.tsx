"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { CloudUpload, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProviderIcon } from "@/components/auth/ProviderIcon";
import { useToast } from "@/components/shared/Toaster";
import { startUpgrade } from "@/lib/auth/guest";
import { EMAIL_ENABLED, enabledProviders, loginChoicesLabel, PROVIDER_LABELS, type AuthProvider } from "@/lib/auth/providers";
import { useMountOnce } from "@/hooks/useMountOnce";
import { cn } from "@/lib/utils";

const EmailAuthDialog = dynamic(() => import("@/components/auth/EmailAuthDialog").then((m) => ({ default: m.EmailAuthDialog })), { ssr: false });

/** Nudge shown to guests: save everything to a Google account, nothing is lost. */
export function GuestUpgradeCard({ className, compact = false }: { className?: string; compact?: boolean }) {
  const toast = useToast();
  const [loading, setLoading] = useState<AuthProvider | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const emailMounted = useMountOnce(emailOpen);

  const upgrade = async (provider: AuthProvider) => {
    setLoading(provider);
    const { error } = await startUpgrade(provider);
    if (error) {
      setLoading(null);
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
              : `Tes voyages ne sont que sur cet appareil. Sauvegarde-les avec ${loginChoicesLabel()} pour les garder et les retrouver partout, sans rien perdre.`}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {enabledProviders().map((provider) => (
          <Button
            key={provider}
            variant="secondary"
            size="lg"
            onClick={() => upgrade(provider)}
            disabled={loading !== null}
            className="w-full"
          >
            {loading === provider ? <Loader2 size={18} className="animate-spin" /> : <ProviderIcon provider={provider} />}
            Sauvegarder avec {PROVIDER_LABELS[provider]}
          </Button>
        ))}
        {EMAIL_ENABLED && (
          <Button variant="secondary" size="lg" onClick={() => setEmailOpen(true)} disabled={loading !== null} className="w-full">
            <Mail size={18} aria-hidden="true" />
            Sauvegarder avec un e-mail
          </Button>
        )}
      </div>
      {emailMounted && <EmailAuthDialog open={emailOpen} onOpenChange={setEmailOpen} mode="upgrade" />}
    </section>
  );
}
