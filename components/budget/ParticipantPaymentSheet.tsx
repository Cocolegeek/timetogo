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
        className="p-0 flex flex-col overflow-hidden"
        style={{ maxHeight: "70dvh" }}
      >
        <div className="flex shrink-0 flex-col items-center gap-3 px-5 pt-9 pb-2 text-center">
          {participant && <ParticipantAvatar participant={participant} size="lg" />}
          <SheetTitle>{participant ? `Payer ${participant.name}` : "Paiement"}</SheetTitle>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto px-5 pt-3 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
            </div>
          ) : !hasInfo ? (
            <p className="py-2 text-center text-[0.95rem] text-muted-foreground">
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
                  raw={info.iban}
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
      className="pressable mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[0.95rem] font-semibold text-primary-foreground shadow-section"
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
    <div className="flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={`truncate text-[0.95rem] text-foreground ${
            monospace ? "font-mono tracking-wide" : ""
          }`}
        >
          {display}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
        aria-label={`Copier ${label}`}
      >
        {copied ? <Check size={15} className="text-positive" /> : <Copy size={15} />}
      </button>
    </div>
  );
}
