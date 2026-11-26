"use client";

import { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { m as motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { VoyouLogo } from "@/components/layout/VoyouLogo";
import { Button } from "@/components/ui/button";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ProviderIcon } from "@/components/auth/ProviderIcon";
import { continueAsGuest, signInWithProvider } from "@/lib/auth/guest";
import { EMAIL_ENABLED, enabledProviders, loginChoicesLabel, PROVIDER_LABELS, type AuthProvider } from "@/lib/auth/providers";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { useMountOnce } from "@/hooks/useMountOnce";
import { clearDataCache } from "@/lib/data/swr";
import { bootInitial } from "@/lib/boot";

const EmailAuthDialog = dynamic(() => import("@/components/auth/EmailAuthDialog").then((m) => ({ default: m.EmailAuthDialog })), { ssr: false });

const BUILDINGS = [
  { x: 26, y: 214, w: 54, h: 150, fill: "#1A1D24" },
  { x: 88, y: 250, w: 62, h: 114, fill: "#D99C82" },
  { x: 158, y: 196, w: 50, h: 168, fill: "#FFFFFF" },
  { x: 216, y: 238, w: 70, h: 126, fill: "#1A1D24" },
  { x: 294, y: 222, w: 52, h: 142, fill: "#C5D3BF" },
];

function LoginIllustration({ compact }: { compact: boolean }) {
  return (
    <div className={cn("relative overflow-hidden bg-[#CFDDE8]", compact ? "h-[34dvh] min-h-52" : "h-[46dvh] min-h-72")}>
      <svg viewBox="0 0 390 420" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <motion.circle
          cx="292"
          r="66"
          fill="#F0BE4C"
          initial={{ cy: 230 }}
          animate={{ cy: 136 }}
          transition={{ duration: 1.4, ease: EASE_OUT }}
        />
        {BUILDINGS.map((b, i) => (
          <motion.rect
            key={i}
            x={b.x}
            width={b.w}
            height={b.h}
            rx="8"
            fill={b.fill}
            initial={{ y: 420 }}
            animate={{ y: b.y }}
            transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.15 + i * 0.07 }}
          />
        ))}
        <path
          d="M0 420V352Q70 322 140 352T280 352 390 340V420Z"
          style={{ fill: "var(--background)" }}
        />
      </svg>
      <div className="absolute left-6" style={{ top: "calc(env(safe-area-inset-top) + 1.75rem)" }}>
        <VoyouLogo size={40} wordmark fixed />
      </div>
    </div>
  );
}

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirect_to"));
  const [emailOpen, setEmailOpen] = useState(false);
  const emailMounted = useMountOnce(emailOpen);

  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  const handleGuest = async () => {
    clearDataCache();
    setGuestLoading(true);
    setGuestError(null);
    const { error } = await continueAsGuest();
    if (error) {
      setGuestLoading(false);
      setGuestError("Le mode invité n'est pas disponible pour le moment.");
      return;
    }
    // Full navigation so the auth cookie reaches the middleware.
    window.location.href = redirectTo;
  };

  const [pending, setPending] = useState<AuthProvider | null>(null);

  const handleOAuthLogin = async (provider: AuthProvider) => {
    clearDataCache();
    setLoading(true);
    setPending(provider);
    await signInWithProvider(provider, redirectTo);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <LoginIllustration compact={enabledProviders().length + (EMAIL_ENABLED ? 1 : 0) > 1} />

      <motion.div
        initial={bootInitial({ opacity: 0, y: 16 })}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.35 }}
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
      >
        <h1 className="font-display text-[2.4rem] leading-[1.02] font-extrabold tracking-[-0.035em]">
          Les voyages entre potes, sans embrouilles.
        </h1>
        <p className="mt-3 text-[1.05rem] leading-relaxed text-muted-foreground">
          Budget partagé, planning et menus au même endroit.
        </p>

        <div className="mt-auto pt-8">
          {enabledProviders().map((provider, i) => (
            <Button
              key={provider}
              onClick={() => handleOAuthLogin(provider)}
              disabled={loading}
              variant={i === 0 ? "ink" : "secondary"}
              size="lg"
              className={i === 0 ? "w-full shadow-raised" : "mt-2 w-full"}
            >
              {pending === provider ? <Loader2 size={18} className="animate-spin" /> : <ProviderIcon provider={provider} />}
              Continuer avec {PROVIDER_LABELS[provider]}
            </Button>
          ))}
          {EMAIL_ENABLED && (
            <Button onClick={() => setEmailOpen(true)} disabled={loading} variant="secondary" size="lg" className="mt-2 w-full">
              <Mail size={18} aria-hidden="true" />
              Continuer avec un e-mail
            </Button>
          )}
          <Button
            onClick={handleGuest}
            disabled={loading || guestLoading}
            variant="ghost"
            size="lg"
            className="mt-2 w-full"
          >
            {guestLoading ? <Loader2 size={18} className="animate-spin" /> : "Continuer en tant qu'invité"}
          </Button>
          {guestError && <p className="mt-2 text-center text-sm text-red-400">{guestError}</p>}
          <p className="mt-3 text-center text-[0.8125rem] leading-relaxed text-muted-foreground">
            Sans compte, tes groupes restent sur cet appareil. Tu pourras les sauvegarder avec {loginChoicesLabel()} à tout moment, sans rien perdre.
          </p>
          <p className="mt-3 text-center text-[0.8125rem]">
            <Link href="/privacy" className="inline-flex min-h-11 items-center font-semibold text-muted-foreground underline underline-offset-4">
              Confidentialité
            </Link>
          </p>
        </div>
      </motion.div>

      {emailMounted && <EmailAuthDialog open={emailOpen} onOpenChange={setEmailOpen} mode="login" redirectTo={redirectTo} />}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
