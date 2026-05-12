"use client";

import { useState } from "react";
import { Copy, Check, Share2, Link2, Users, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
  const entityLabel = trip.type === "group" ? "budget" : "voyage";
  const participantLabel = trip.type === "group" ? "participant" : "voyageur";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glass-strong border-foreground/10 w-[calc(100vw-2rem)] max-w-md p-0 max-h-[92vh] flex flex-col overflow-hidden"
        showCloseButton={false}
      >
        {/* ── Hero preview ── */}
        <div
          className="relative overflow-hidden shrink-0"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-500), oklch(0.50 calc(var(--accent-c) + 0.04) calc(var(--accent-h) + 25)))",
          }}
        >
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, oklch(1 0 0 / 22%), transparent 70%)",
              filter: "blur(20px)",
            }}
          />
          <div className="relative px-5 pt-5 pb-3 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shrink-0 overflow-hidden bg-white/15 border border-white/20 backdrop-blur-sm">
              {trip.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={trip.iconUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                trip.emoji
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-0.5">
                {trip.type === "group" ? "Budget partagé" : "Voyage"}
              </p>
              <h2 className="font-bold text-white text-xl leading-tight truncate">{trip.name}</h2>
              {trip.type === "trip" && trip.destination && (
                <p className="text-sm text-white/75 flex items-center gap-1 mt-0.5 truncate">
                  <MapPin size={11} className="shrink-0" />
                  {trip.destination}
                </p>
              )}
              <p className="text-xs text-white/60 flex items-center gap-1 mt-1">
                <Users size={11} />
                {trip.participants.length} {participantLabel}
                {trip.participants.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="relative px-5 pb-4">
            <p className="text-sm font-semibold text-white/90">
              Ramène tes complices dans l&apos;aventure ! 🎒
            </p>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Code d'accès */}
          <div className="space-y-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Code d&apos;accès
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-3 px-2 glass-subtle rounded-xl overflow-hidden">
                {trip.shareCode.split("").map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-section-soft"
                  >
                    {char}
                  </motion.span>
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyCode}
                className="text-slate-400 hover:text-slate-200 shrink-0 h-11 w-11"
                aria-label="Copier le code"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copiedCode ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                    >
                      <Check size={18} className="text-emerald-400" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                    >
                      <Copy size={18} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>

          {/* Lien direct */}
          <div className="space-y-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Lien direct
            </p>
            <div className="flex items-center gap-2 p-3 glass-subtle rounded-xl">
              <Link2 size={13} className="text-slate-500 shrink-0" />
              <p className="text-sm text-section-soft truncate flex-1 font-mono">
                {shareUrl.replace(/^https?:\/\//, "")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={copyUrl}
                className="flex-1 bg-section-soft hover:bg-section-medium text-section-soft border border-section"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copiedUrl ? (
                    <motion.span
                      key="ok"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Check size={15} className="text-emerald-400" /> Copié !
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Copy size={15} /> Copier le lien
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
              {canShare && (
                <Button
                  onClick={nativeShare}
                  className="flex-1 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30"
                >
                  <Share2 size={15} />
                  Partager
                </Button>
              )}
            </div>
          </div>

          {/* Explication */}
          <div className="glass-subtle rounded-xl p-3.5">
            <p className="text-sm text-slate-400 leading-relaxed">
              Tes potes ouvrent le lien, se connectent avec Google, choisissent
              leur identité et rejoignent le {entityLabel} en quelques secondes.
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-5 py-3 border-t border-foreground/8 bg-slate-900/50 shrink-0"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="w-full text-slate-300 hover:text-slate-100 hover:bg-foreground/8"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
