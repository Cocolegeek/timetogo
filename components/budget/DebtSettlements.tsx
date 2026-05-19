"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  Loader2,
  Copy,
  Check,
  CreditCard,
  Phone,
  ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import { lydiaLink, weroLink, formatIban } from "@/lib/payment-links";
import { usePaymentInfo, type PaymentInfo } from "@/hooks/usePaymentInfo";
import { AllSettledEmpty } from "./AllSettledEmpty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Settlement, Participant } from "@/types";

interface DebtSettlementsProps {
  settlements: Settlement[];
  participants: Participant[];
  currency: string;
  onSettle: (settlement: Settlement) => Promise<void>;
}

export function DebtSettlements({
  settlements,
  participants,
  currency,
  onSettle,
}: DebtSettlementsProps) {
  const [pending, setPending] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(false);
  const { info, loading: loadingInfo } = usePaymentInfo(pending?.toId ?? null);

  const handleConfirm = async () => {
    if (!pending) return;
    setLoading(true);
    try {
      await onSettle(pending);
      setPending(null);
    } finally {
      setLoading(false);
    }
  };

  if (settlements.length === 0) {
    return <AllSettledEmpty />;
  }

  const pendingFrom = pending ? participants.find((p) => p.id === pending.fromId) : null;
  const pendingTo = pending ? participants.find((p) => p.id === pending.toId) : null;

  return (
    <>
      <div className="space-y-3">
        {settlements.map((s, i) => {
          const from = participants.find((p) => p.id === s.fromId);
          const to = participants.find((p) => p.id === s.toId);
          if (!from || !to) return null;

          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setPending(s)}
              className="w-full glass-subtle border border-section rounded-2xl px-4 py-4 flex flex-col gap-3 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: from.color }}
                  />
                  <span className="text-lg font-semibold text-slate-100 truncate">
                    {from.name}
                  </span>
                </div>

                <ArrowDown size={14} className="text-slate-500 shrink-0 rotate-[-90deg]" />

                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: to.color }}
                  />
                  <span className="text-base font-semibold text-slate-100 truncate">
                    {to.name}
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-section-soft tabular-nums">
                  {formatCurrency(s.amount, currency)}
                </span>
                <span className="text-xs font-semibold text-section-soft mb-0.5 px-2 py-0.5 rounded-md bg-section-soft border border-section">
                  Régler ma dette
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      <Dialog open={!!pending} onOpenChange={(open) => { if (!open && !loading) setPending(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmer le remboursement</DialogTitle>
          </DialogHeader>

          {pendingFrom && pendingTo && pending && (
            <div className="py-2 space-y-4">
              <div className="glass-subtle rounded-xl px-4 py-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: pendingFrom.color }}
                  />
                  <span className="font-semibold text-slate-100">{pendingFrom.name}</span>
                  <span className="text-slate-500 text-sm">rembourse</span>
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: pendingTo.color }}
                  />
                  <span className="font-semibold text-slate-100">{pendingTo.name}</span>
                </div>
                <p className="text-2xl font-bold text-section-soft tabular-nums">
                  {formatCurrency(pending.amount, currency)}
                </p>
              </div>

              <PaymentDetails
                info={info}
                loading={loadingInfo}
                recipientName={pendingTo.name}
                amount={pending.amount}
                currency={currency}
              />

              <p className="text-sm text-slate-400">
                Un remboursement sera ajouté dans les dépenses et les soldes seront mis à jour.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setPending(null)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="gradient-primary text-white border-0"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : "Régler"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── PaymentDetails ───────────────────────────────────────────────────────────

function PaymentDetails({
  info,
  loading,
  recipientName,
  amount,
  currency,
}: {
  info: PaymentInfo | null;
  loading: boolean;
  recipientName: string;
  amount: number;
  currency: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 size={14} className="animate-spin text-slate-500" />
      </div>
    );
  }

  if (!info || (!info.iban && !info.phone)) {
    return (
      <p className="text-sm text-slate-500 italic">
        {recipientName} n&apos;a pas renseigné ses infos de paiement.
      </p>
    );
  }

  const lydia = lydiaLink(info.phone);
  const wero = weroLink(info.phone);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Payer {recipientName}
      </p>

      {info.iban && (
        <PaymentRow
          icon={<CreditCard size={14} />}
          label="IBAN"
          value={formatIban(info.iban)}
          rawValue={info.iban}
          monospace
        />
      )}

      {info.phone && (
        <PaymentRow
          icon={<Phone size={14} />}
          label="Téléphone"
          value={info.phone}
          rawValue={info.phone}
        />
      )}

      {(lydia || wero) && (
        <div className="flex gap-2 pt-1">
          {lydia && (
            <a
              href={lydia}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-foreground/10 bg-foreground/4 text-slate-200 hover:bg-foreground/8 transition-colors"
            >
              <span>Lydia</span>
              <ExternalLink size={12} className="text-slate-500" />
            </a>
          )}
          {wero && (
            <a
              href={wero}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-foreground/10 bg-foreground/4 text-slate-200 hover:bg-foreground/8 transition-colors"
            >
              <span>Wero</span>
              <ExternalLink size={12} className="text-slate-500" />
            </a>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Montant à transférer :{" "}
        <span className="text-slate-300 font-semibold tabular-nums">
          {formatCurrency(amount, currency)}
        </span>
      </p>
    </div>
  );
}

function PaymentRow({
  icon,
  label,
  value,
  rawValue,
  monospace = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  rawValue: string;
  monospace?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available — silent fail
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-foreground/8 bg-foreground/4">
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
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-foreground/8 transition-colors shrink-0"
        aria-label={`Copier ${label}`}
      >
        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
      </button>
    </div>
  );
}
