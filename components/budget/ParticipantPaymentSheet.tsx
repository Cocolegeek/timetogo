"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Copy, Check, CreditCard, Phone, Loader2, Share2 } from "lucide-react";
import { usePaymentInfo } from "@/hooks/usePaymentInfo";
import {
  formatIban,
  sharePaymentInfo,
  canNativeShare,
} from "@/lib/payment-links";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import type { Participant } from "@/types";

interface ParticipantPaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: Participant | null;
}

export function ParticipantPaymentSheet({
  open,
  onOpenChange,
  participant,
}: ParticipantPaymentSheetProps) {
  const { info, loading } = usePaymentInfo(open ? participant?.id ?? null : null);
  const hasInfo = !!(info && (info.iban || info.phone));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="glass-strong border-foreground/10 rounded-t-2xl p-0 flex flex-col overflow-hidden"
        style={{ maxHeight: "70dvh" }}
      >
        <div className="px-5 pt-5 pb-3 border-b border-foreground/8 shrink-0 pr-14">
          <SheetTitle className="text-slate-100 text-lg font-bold flex items-center gap-3">
            {participant && (
              <>
                <ParticipantAvatar participant={participant} size="sm" />
                <span>Remboursements — {participant.name}</span>
              </>
            )}
          </SheetTitle>
        </div>

        <div
          className="flex-1 overflow-y-auto px-5 py-5 space-y-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={18} className="animate-spin text-slate-500" />
            </div>
          ) : !hasInfo ? (
            <p className="text-sm text-slate-500 italic py-2">
              {participant?.name} n&apos;a pas (encore) renseigné ses infos de
              paiement.
            </p>
          ) : (
            <>
              {info?.iban && (
                <CopyRow
                  icon={<CreditCard size={14} />}
                  label="IBAN"
                  display={formatIban(info.iban)}
                  raw={formatIban(info.iban)}
                  monospace
                />
              )}
              {info?.phone && (
                <CopyRow
                  icon={<Phone size={14} />}
                  label="Téléphone"
                  display={info.phone}
                  raw={info.phone}
                />
              )}
              {participant && (
                <ShareButton
                  recipientName={participant.name}
                  iban={info?.iban ?? null}
                  phone={info?.phone ?? null}
                />
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ShareButton({
  recipientName,
  iban,
  phone,
}: {
  recipientName: string;
  iban: string | null;
  phone: string | null;
}) {
  const [feedback, setFeedback] = useState<null | "shared" | "copied">(null);

  const handleShare = async () => {
    const result = await sharePaymentInfo({ recipientName, iban, phone });
    if (result === "shared" || result === "copied") {
      setFeedback(result);
      setTimeout(() => setFeedback(null), 1800);
    }
  };

  const isNative = canNativeShare();

  return (
    <button
      type="button"
      onClick={handleShare}
      className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold border border-section bg-section-soft text-section-soft hover:bg-section-medium transition-colors active:scale-[0.99]"
    >
      {feedback === "shared" ? (
        <><Check size={15} /> Partagé</>
      ) : feedback === "copied" ? (
        <><Check size={15} /> Copié dans le presse-papiers</>
      ) : (
        <><Share2 size={15} /> {isNative ? "Partager dans une app" : "Copier toutes les infos"}</>
      )}
    </button>
  );
}

function CopyRow({
  icon,
  label,
  display,
  raw,
  monospace = false,
}: {
  icon: React.ReactNode;
  label: string;
  display: string;
  raw: string;
  monospace?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-xl border border-foreground/8 bg-foreground/4">
      <span className="text-slate-500 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          {label}
        </p>
        <p
          className={`text-sm text-slate-100 truncate ${
            monospace ? "font-mono tracking-wide" : ""
          }`}
        >
          {display}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-foreground/8 transition-colors shrink-0"
        aria-label={`Copier ${label}`}
      >
        {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
      </button>
    </div>
  );
}
