"use client";

import { useState } from "react";
import { Copy, Check, Share2, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Trip } from "@/types";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
}

export function ShareModal({ open, onOpenChange, trip }: ShareModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join?code=${trip.shareCode}`
      : `/join?code=${trip.shareCode}`;

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
        title: `Rejoins ${trip.name} sur Time to Go`,
        text: `Code : ${trip.shareCode} — ou utilise ce lien pour rejoindre "${trip.name}"`,
        url: shareUrl,
      });
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") throw e;
    }
  };

  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-foreground/10 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Partager le voyage</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Trip info */}
          <div className="flex items-center gap-3 p-3 glass-subtle rounded-xl">
            <span className="text-2xl">{trip.emoji}</span>
            <div>
              <p className="font-medium text-slate-200 text-sm">{trip.name}</p>
              <p className="text-xs text-slate-500">
                {trip.type === "trip" ? trip.destination : "Budget partagé"}
              </p>
            </div>
          </div>

          {/* Code */}
          <div className="space-y-2">
            <p className="text-sm text-slate-300 uppercase tracking-wider font-semibold">
              Code d'accès
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center justify-center gap-1.5 py-3 glass-subtle rounded-xl">
                {trip.shareCode.split("").map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="font-mono text-2xl font-bold tracking-widest text-section-soft"
                  >
                    {char}
                  </motion.span>
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyCode}
                className="text-slate-400 hover:text-slate-200 shrink-0"
              >
                {copiedCode ? (
                  <Check size={16} className="text-emerald-400" />
                ) : (
                  <Copy size={16} />
                )}
              </Button>
            </div>
          </div>

          {/* Share URL */}
          <div className="space-y-2">
            <p className="text-sm text-slate-300 uppercase tracking-wider font-semibold">
              Lien de partage
            </p>
            <div className="flex items-center gap-2 p-3 glass-subtle rounded-xl">
              <Link2 size={14} className="text-slate-500 shrink-0" />
              <p className="text-sm text-slate-300 truncate flex-1 font-mono">
                {shareUrl.replace(/^https?:\/\//, "")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={copyUrl}
                className="flex-1 bg-section-soft hover:bg-section-medium text-section-soft border border-section"
              >
                {copiedUrl ? (
                  <Check size={15} className="text-emerald-400" />
                ) : (
                  <Copy size={15} />
                )}
                {copiedUrl ? "Copié !" : "Copier le lien"}
              </Button>
              {canShare && (
                <Button
                  onClick={nativeShare}
                  className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30"
                >
                  <Share2 size={15} />
                  Partager
                </Button>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="glass-subtle rounded-xl p-3.5">
            <p className="text-sm text-slate-400 leading-relaxed">
              Les personnes qui ouvrent ce lien devront se connecter avec Google,
              puis choisir qui elles sont parmi les{" "}
              <span className="text-slate-200 font-medium">
                {trip.participants.length} voyageur{trip.participants.length !== 1 ? "s" : ""}
              </span>{" "}
              du voyage. Elles pourront ensuite tout voir et modifier.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
