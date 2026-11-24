"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearDataCache } from "@/lib/data/swr";
import { safeRedirectPath } from "@/lib/auth/redirect";
import {
  EMAIL_ERROR_MESSAGES,
  OTP_LENGTH,
  RESEND_DELAY_S,
  normalizeCode,
  sendExistingAccountCode,
  sendLoginCode,
  startEmailUpgrade,
  verifyExistingAccountCode,
  verifyLoginCode,
  verifyUpgradeCode,
  isValidEmail,
} from "@/lib/auth/email";

type Mode = "login" | "upgrade";
type Step = "email" | "code" | "done";
/** login = connexion ; upgrade = rattacher l'e-mail à l'invité ; existing = l'adresse a déjà un compte. */
type Kind = "login" | "upgrade" | "existing";

interface EmailAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  redirectTo?: string;
}

export function EmailAuthDialog({ open, onOpenChange, mode, redirectTo }: EmailAuthDialogProps) {
  const [step, setStep] = useState<Step>("email");
  const [kind, setKind] = useState<Kind>(mode === "login" ? "login" : "upgrade");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [movedTrips, setMovedTrips] = useState(0);

  useEffect(() => {
    if (!resendAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [resendAt]);

  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const armCooldown = () => {
    const t = Date.now();
    setNow(t);
    setResendAt(t + RESEND_DELAY_S * 1000);
  };

  const close = () => {
    if (busy) return;
    onOpenChange(false);
    setTimeout(() => {
      setStep("email");
      setKind(mode === "login" ? "login" : "upgrade");
      setCode("");
      setError(null);
      setResendAt(0);
    }, 250);
  };

  const submitEmail = async () => {
    if (busy) return;
    if (!isValidEmail(email)) {
      setError(EMAIL_ERROR_MESSAGES.invalid_email);
      return;
    }
    setBusy(true);
    setError(null);
    let nextKind: Kind = mode === "login" ? "login" : "upgrade";
    let res = mode === "login" ? await sendLoginCode(email) : await startEmailUpgrade(email);
    if (!res.ok && res.reason === "exists" && mode === "upgrade") {
      nextKind = "existing";
      res = await sendExistingAccountCode(email);
    }
    setBusy(false);
    if (!res.ok) {
      setError(EMAIL_ERROR_MESSAGES[res.reason]);
      return;
    }
    setKind(nextKind);
    setCode("");
    setStep("code");
    armCooldown();
  };

  const resend = async () => {
    if (busy || remaining > 0) return;
    setBusy(true);
    setError(null);
    const res = kind === "login" ? await sendLoginCode(email) : kind === "upgrade" ? await startEmailUpgrade(email) : await sendExistingAccountCode(email);
    setBusy(false);
    if (!res.ok) {
      setError(EMAIL_ERROR_MESSAGES[res.reason]);
      return;
    }
    armCooldown();
  };

  const submitCode = async (value: string) => {
    if (busy || value.length < OTP_LENGTH) return;
    setBusy(true);
    setError(null);

    if (kind === "login") {
      const res = await verifyLoginCode(email, value);
      if (!res.ok) {
        setBusy(false);
        setError(EMAIL_ERROR_MESSAGES[res.reason]);
        return;
      }
      clearDataCache();
      // Navigation complète : le cookie de session doit atteindre le middleware.
      window.location.href = safeRedirectPath(redirectTo ?? "/trips");
      return;
    }

    if (kind === "upgrade") {
      const res = await verifyUpgradeCode(email, value);
      setBusy(false);
      if (!res.ok) {
        setError(EMAIL_ERROR_MESSAGES[res.reason]);
        return;
      }
      setMovedTrips(0);
      setStep("done");
      return;
    }

    const res = await verifyExistingAccountCode(email, value);
    setBusy(false);
    if (!res.ok) {
      setError(EMAIL_ERROR_MESSAGES[res.reason]);
      return;
    }
    clearDataCache();
    setMovedTrips(res.value.trips);
    setStep("done");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-sm">
        {step === "email" && (
          <form
            noValidate
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void submitEmail();
            }}
          >
            <span className="flex size-14 items-center justify-center rounded-[1.1rem] bg-foreground/[0.06]">
              <Mail size={24} aria-hidden="true" />
            </span>
            <div className="space-y-1.5">
              <DialogTitle>{mode === "login" ? "Continuer avec ton e-mail" : "Sauvegarder avec ton e-mail"}</DialogTitle>
              <DialogDescription className="text-[0.95rem] leading-relaxed">
                {mode === "login"
                  ? "On t'envoie un code à 6 chiffres. Pas de mot de passe à retenir."
                  : "On relie ton e-mail à ce compte invité : tes voyages restent tels quels, et tu les retrouves partout."}
              </DialogDescription>
            </div>
            <div className="space-y-2">
              <label htmlFor="auth-email" className="px-1 text-sm font-semibold">
                Ton adresse e-mail
              </label>
              <Input
                id="auth-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom@exemple.fr"
              />
              {error && (
                <p role="alert" className="px-1 text-sm text-red-400">
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={busy || email.trim().length === 0}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : "Recevoir un code"}
            </Button>
          </form>
        )}

        {step === "code" && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <DialogTitle>Entre ton code</DialogTitle>
              <DialogDescription className="text-[0.95rem] leading-relaxed">
                Envoyé à <span className="font-semibold text-foreground">{email.trim()}</span>. Pense à regarder tes courriers indésirables.
              </DialogDescription>
            </div>
            {kind === "existing" && (
              <p className="rounded-2xl bg-secondary px-4 py-3 text-sm leading-relaxed">
                Cette adresse a déjà un compte Voyou. Entre le code pour t&apos;y connecter : on y ajoutera les voyages de ton compte invité.
              </p>
            )}
            <div className="space-y-2">
              <label htmlFor="auth-code" className="sr-only">
                Code à {OTP_LENGTH} chiffres
              </label>
              <Input
                id="auth-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                autoFocus
                value={code}
                disabled={busy}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const next = normalizeCode(e.target.value);
                  setCode(next);
                  if (next.length === OTP_LENGTH) void submitCode(next);
                }}
                placeholder={"•".repeat(OTP_LENGTH)}
                className="tabular h-14 text-center font-display text-3xl tracking-[0.4em]"
              />
              {error && (
                <p role="alert" className="px-1 text-sm text-red-400">
                  {error}
                </p>
              )}
            </div>
            <Button size="lg" className="w-full" disabled={busy || code.length < OTP_LENGTH} onClick={() => void submitCode(code)}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : "Valider"}
            </Button>
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="lg" className="w-full" disabled={busy || remaining > 0} onClick={() => void resend()}>
                {remaining > 0 ? `Renvoyer le code dans ${remaining} s` : "Renvoyer le code"}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                disabled={busy}
                onClick={() => {
                  setStep("email");
                  setKind(mode === "login" ? "login" : "upgrade");
                  setError(null);
                }}
              >
                Changer d&apos;adresse
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-5 text-center">
            <span className="animate-pop mx-auto flex size-16 items-center justify-center rounded-[1.25rem] bg-emerald-500 text-white shadow-raised">
              <Check size={30} strokeWidth={2.6} aria-hidden="true" />
            </span>
            <div className="space-y-1.5">
              <DialogTitle>{kind === "existing" ? "Tout est rapatrié" : "Compte sauvegardé"}</DialogTitle>
              <DialogDescription className="text-[0.95rem] leading-relaxed">
                {kind === "existing"
                  ? movedTrips > 0
                    ? `${movedTrips} voyage${movedTrips > 1 ? "s" : ""} et leurs dépenses ont rejoint ton compte.`
                    : "Ton compte est prêt."
                  : `Tes voyages sont maintenant liés à ${email.trim()}. Tu les retrouveras sur tous tes appareils.`}
              </DialogDescription>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                if (kind === "existing") window.location.href = "/trips";
                else close();
              }}
            >
              {kind === "existing" ? "Voir mes voyages" : "Terminer"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
