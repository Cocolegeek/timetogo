"use client";

import { loginChoicesLabel } from "@/lib/auth/providers";
import { useState } from "react";
import { Copy, Check, Share, Link2 } from "lucide-react";
import { m as motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TripCover } from "@/components/trips/TripCover";
import { EASE_OUT } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import type { Trip } from "@/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://voyou.app";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
}

export function ShareModal({ open, onOpenChange, trip }: ShareModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const shareUrl = `${SITE_URL}/join?code=${trip.shareCode}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  };

  const copyUrl = async () => {
    await copyToClipboard(shareUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copyCode = async () => {
    await copyToClipboard(trip.shareCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const nativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: "Voyou — Rejoins la bande",
        text: `Rejoins la bande sur Voyou pour "${trip.name}" 🎒`,
        url: shareUrl,
      });
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") throw e;
    }
  };

  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <TripCover seed={trip.id} className="h-28 shrink-0" />

        <div className="flex-1 space-y-6 overflow-y-auto px-6 pt-5 pb-6">
          <div>
            <DialogTitle className="text-2xl">Invite tes potes</DialogTitle>
            <p className="mt-1 text-[0.95rem] text-muted-foreground">
              Ils rejoignent <span className="font-semibold text-foreground">{trip.name}</span> en deux clics, avec leur compte {loginChoicesLabel()}.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-muted-foreground">Code d&apos;accès</p>
              <button
                type="button"
                onClick={copyCode}
                className="flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                aria-label="Copier le code"
              >
                {copiedCode ? <Check size={15} /> : <Copy size={15} />}
                {copiedCode ? "Copié" : "Copier"}
              </button>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {trip.shareCode.split("").map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04, duration: 0.4, ease: EASE_OUT }}
                  className="flex aspect-[4/5] items-center justify-center rounded-2xl bg-secondary font-display text-2xl font-extrabold text-foreground"
                >
                  {char}
                </motion.span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="px-1 text-sm font-semibold text-muted-foreground">Lien d&apos;invitation</p>
            <button
              type="button"
              onClick={copyUrl}
              className="pressable flex w-full items-center gap-3 rounded-2xl bg-secondary px-4 py-3 text-left"
            >
              <Link2 size={17} className="shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-[0.95rem]">{shareUrl.replace(/^https?:\/\//, "")}</span>
              <span className="shrink-0 text-sm font-semibold text-primary">{copiedUrl ? "Copié" : "Copier"}</span>
            </button>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-border px-5 pt-3 pb-4">
          <Button variant="secondary" size="lg" onClick={() => onOpenChange(false)} className="flex-1">
            Fermer
          </Button>
          {canShare ? (
            <Button size="lg" onClick={nativeShare} className="flex-[2] shadow-section">
              <Share size={17} />
              Partager le lien
            </Button>
          ) : (
            <Button size="lg" onClick={copyUrl} className="flex-[2] shadow-section">
              {copiedUrl ? <Check size={17} /> : <Copy size={17} />}
              {copiedUrl ? "Lien copié" : "Copier le lien"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
