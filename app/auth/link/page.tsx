"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { m as motion } from "framer-motion";
import { Check, Loader2, TriangleAlert, UsersRound } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProviderIcon } from "@/components/auth/ProviderIcon";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { VoyouLoader } from "@/components/shared/VoyouLoader";
import { claimGuestTransfer, signInToExisting, startUpgrade, syncProfileFromProvider } from "@/lib/auth/guest";
import { parseProvider, PROVIDER_LABELS } from "@/lib/auth/providers";
import { syncMyParticipantAvatars } from "@/lib/avatar-sync";
import { clearDataCache } from "@/lib/data/swr";
import { EASE_OUT } from "@/lib/motion";
import { bootInitial } from "@/lib/boot";

type Outcome =
  | { kind: "working" }
  | { kind: "linked" }
  | { kind: "merged"; trips: number }
  | { kind: "exists" }
  | { kind: "error"; message: string };

function Screen({ icon, tone, title, children }: { icon: React.ReactNode; tone: "ok" | "info" | "warn"; title: string; children: React.ReactNode }) {
  const toneClass =
    tone === "ok" ? "bg-emerald-500 text-white" : tone === "warn" ? "bg-amber-500/15 text-amber-400" : "bg-foreground/[0.06] text-foreground";
  return (
    <motion.div
      initial={bootInitial({ opacity: 0, y: 16 })}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 4rem)", paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
    >
      <motion.span
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.1 }}
        className={`flex size-16 items-center justify-center rounded-[1.25rem] ${toneClass}`}
      >
        {icon}
      </motion.span>
      <h1 className="mt-6 font-display text-[2rem] leading-[1.05] font-extrabold tracking-[-0.03em]">{title}</h1>
      <div className="mt-3 flex flex-1 flex-col text-[0.98rem] leading-relaxed text-muted-foreground">{children}</div>
    </motion.div>
  );
}

function LinkFlow() {
  const params = useSearchParams();
  const errorCode = params.get("error_code");
  const step = params.get("step");
  const provider = parseProvider(params.get("provider"));
  const label = PROVIDER_LABELS[provider];
  const initial: Outcome =
    errorCode === "identity_already_exists"
      ? { kind: "exists" }
      : errorCode
        ? { kind: "error", message: `La connexion à ${label} n'a pas abouti.` }
        : { kind: "working" };
  const [outcome, setOutcome] = useState<Outcome>(initial);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (initial.kind !== "working" || started.current) return;
    started.current = true;
    const run = async () => {
      try {
        if (step === "claim") {
          // Signed in to the existing account: pull the guest's trips in.
          const result = await claimGuestTransfer();
          clearDataCache();
          await syncProfileFromProvider(provider);
          await syncMyParticipantAvatars();
          setOutcome({ kind: "merged", trips: result.trips });
        } else {
          // The provider was linked to the guest account itself: same user, nothing to move.
          await claimGuestTransfer().catch(() => null);
          await syncProfileFromProvider(provider);
          await syncMyParticipantAvatars();
          setOutcome({ kind: "linked" });
        }
      } catch {
        setOutcome({ kind: "error", message: "Le transfert a expiré ou a déjà été fait. Tes voyages invité sont peut-être déjà là." });
      }
    };
    void run();
  }, [initial.kind, step, provider]);

  if (outcome.kind === "working") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <VoyouLoader label="On met tes voyages à l'abri…" />
      </div>
    );
  }

  if (outcome.kind === "exists") {
    return (
      <Screen icon={<UsersRound size={28} />} tone="info" title={`Ce compte ${label} existe déjà`}>
        <p>
          Pas de souci : connecte-toi avec, et on y ajoute tous les voyages et dépenses créés en invité. Rien n&apos;est perdu, rien n&apos;est
          dupliqué.
        </p>
        <div className="mt-auto space-y-2 pt-8">
          <Button
            size="lg"
            className="w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await signInToExisting(provider);
            }}
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <ProviderIcon provider={provider} />}
            Continuer avec ce compte {label}
          </Button>
          <Link href="/trips" className={buttonVariants({ variant: "ghost", size: "lg", className: "w-full" })}>
            Plus tard
          </Link>
        </div>
      </Screen>
    );
  }

  if (outcome.kind === "error") {
    return (
      <Screen icon={<TriangleAlert size={28} />} tone="warn" title="Ça n'a pas marché">
        <p>{outcome.message}</p>
        <div className="mt-auto space-y-2 pt-8">
          <Button size="lg" className="w-full" onClick={() => void startUpgrade(provider)}>
            <ProviderIcon provider={provider} />
            Réessayer
          </Button>
          <Link href="/trips" className={buttonVariants({ variant: "ghost", size: "lg", className: "w-full" })}>
            Retour à mes voyages
          </Link>
        </div>
      </Screen>
    );
  }

  return (
    <Screen icon={<Check size={30} strokeWidth={2.6} />} tone="ok" title={outcome.kind === "merged" ? "Tout est rapatrié" : "Compte sauvegardé"}>
      <p>
        {outcome.kind === "merged"
          ? outcome.trips > 0
            ? `${outcome.trips} voyage${outcome.trips > 1 ? "s" : ""} et leurs dépenses ont rejoint ton compte ${label}.`
            : `Ton compte ${label} est prêt.`
          : `Tes voyages sont maintenant liés à ton compte ${label}. Tu les retrouveras sur tous tes appareils.`}
      </p>
      <div className="mt-auto pt-8">
        <Link href="/trips" className={buttonVariants({ size: "lg", className: "w-full" })}>
          Voir mes voyages
        </Link>
      </div>
    </Screen>
  );
}

export default function AuthLinkPage() {
  return (
    <div className="min-h-dvh bg-background">
      <Suspense fallback={<div className="mx-auto max-w-md px-6 pt-16"><PageSkeleton /></div>}>
        <LinkFlow />
      </Suspense>
    </div>
  );
}
