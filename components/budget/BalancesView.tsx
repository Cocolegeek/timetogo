"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Check,
  Loader2,
} from "lucide-react";
import { formatCurrency, currencySymbol } from "@/lib/format-currency";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import { ParticipantPaymentSheet } from "./ParticipantPaymentSheet";
import { AllSettledEmpty } from "./AllSettledEmpty";
import { IAmSettledEmpty } from "./IAmSettledEmpty";
import { usePaymentInfo } from "@/hooks/usePaymentInfo";
import { formatIban, sharePaymentInfo, canNativeShare } from "@/lib/payment-links";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Balance, Participant, Settlement } from "@/types";

interface BalancesViewProps {
  myId: string | null;
  balances: Balance[];
  settlements: Settlement[];
  participants: Participant[];
  currency: string;
  onSettle: (settlement: Settlement) => Promise<void>;
}

export function BalancesView({
  myId,
  balances,
  settlements,
  participants,
  currency,
  onSettle,
}: BalancesViewProps) {
  const [openParticipant, setOpenParticipant] = useState<Participant | null>(null);
  const [othersOpen, setOthersOpen] = useState(false);
  const [debtTarget, setDebtTarget] = useState<Settlement | null>(null);

  if (settlements.length === 0) {
    return <AllSettledEmpty />;
  }

  const myBalance = myId ? balances.find((b) => b.participantId === myId) : null;
  const meSettled = myBalance ? Math.abs(myBalance.net) < 0.005 : false;

  const theyOweMe = myId
    ? settlements.filter((s) => s.toId === myId)
    : [];
  const iOweThem = myId
    ? settlements.filter((s) => s.fromId === myId)
    : [];
  const otherSettlements = myId
    ? settlements.filter((s) => s.fromId !== myId && s.toId !== myId)
    : settlements;

  const participantBy = (id: string) => participants.find((p) => p.id === id);

  return (
    <div className="space-y-5">
      {myId ? (
        meSettled && iOweThem.length === 0 && theyOweMe.length === 0 ? (
          <div className="glass-subtle border border-foreground/8 rounded-2xl p-4">
            <IAmSettledEmpty />
          </div>
        ) : (
          <>
            {/* Ils me doivent */}
            {theyOweMe.length > 0 && (
              <SettlementSection
                tone="positive"
                icon={<ArrowDownLeft size={14} />}
                label="Ils me doivent"
                count={theyOweMe.length}
                total={theyOweMe.reduce((sum, s) => sum + s.amount, 0)}
                currency={currency}
              >
                {theyOweMe.map((s) => {
                  const from = participantBy(s.fromId);
                  if (!from) return null;
                  return (
                    <BalanceRow
                      key={`${s.fromId}-${s.toId}`}
                      participant={from}
                      amount={s.amount}
                      currency={currency}
                      tone="positive"
                      onClick={() => setOpenParticipant(from)}
                    />
                  );
                })}
              </SettlementSection>
            )}

            {/* Je leur dois */}
            {iOweThem.length > 0 && (
              <SettlementSection
                tone="negative"
                icon={<ArrowUpRight size={14} />}
                label="Je leur dois"
                count={iOweThem.length}
                total={iOweThem.reduce((sum, s) => sum + s.amount, 0)}
                currency={currency}
              >
                {iOweThem.map((s) => {
                  const to = participantBy(s.toId);
                  if (!to) return null;
                  return (
                    <BalanceRow
                      key={`${s.fromId}-${s.toId}`}
                      participant={to}
                      amount={s.amount}
                      currency={currency}
                      tone="negative"
                      onClick={() => setDebtTarget(s)}
                    />
                  );
                })}
              </SettlementSection>
            )}
          </>
        )
      ) : null}

      {/* Autres règlements — dépliable */}
      {otherSettlements.length > 0 && (
        <div className="rounded-2xl border border-foreground/8 bg-foreground/3 overflow-hidden">
          <button
            type="button"
            onClick={() => setOthersOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-foreground/4 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              {myId ? "Entre les autres" : "Remboursements"}
              <span className="text-xs text-slate-500 font-normal">
                ({otherSettlements.length})
              </span>
            </span>
            <ChevronDown
              size={16}
              className={cn(
                "text-slate-500 transition-transform",
                othersOpen && "rotate-180"
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {othersOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 pt-1 space-y-1.5">
                  {otherSettlements.map((s) => {
                    const from = participantBy(s.fromId);
                    const to = participantBy(s.toId);
                    if (!from || !to) return null;
                    return (
                      <ThirdPartyRow
                        key={`${s.fromId}-${s.toId}`}
                        from={from}
                        to={to}
                        amount={s.amount}
                        currency={currency}
                        onSettle={() => onSettle(s)}
                      />
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Tous les soldes — résumé compact en bas */}
      {balances.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
            Tous les soldes
          </p>
          <div className="grid grid-cols-2 gap-2">
            {balances.map((balance) => {
              const p = participantBy(balance.participantId);
              if (!p) return null;
              const isCreditor = balance.net > 0.005;
              const isDebtor = balance.net < -0.005;
              const sign = isCreditor ? "+" : isDebtor ? "-" : "";
              const tone = isCreditor
                ? "text-emerald-400"
                : isDebtor
                  ? "text-red-400"
                  : "text-slate-500";
              return (
                <button
                  key={balance.participantId}
                  type="button"
                  onClick={() => setOpenParticipant(p)}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl glass-subtle border border-foreground/8 hover:bg-foreground/5 active:scale-[0.99] transition-all text-left"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-sm font-medium text-slate-200 truncate">
                      {p.name}
                    </span>
                  </span>
                  <span className={cn("text-sm font-semibold tabular-nums shrink-0", tone)}>
                    {sign}
                    {formatCurrency(Math.abs(balance.net), currency)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sheet de paiement (creditor view — pour donner mes infos / consulter celles d'un autre) */}
      <ParticipantPaymentSheet
        open={!!openParticipant}
        onOpenChange={(open) => { if (!open) setOpenParticipant(null); }}
        participant={openParticipant}
      />

      {/* Modal "régler ma dette" — debtor → creditor */}
      <SettleDebtDialog
        settlement={debtTarget}
        from={debtTarget ? participantBy(debtTarget.fromId) ?? null : null}
        to={debtTarget ? participantBy(debtTarget.toId) ?? null : null}
        currency={currency}
        onClose={() => setDebtTarget(null)}
        onSettle={onSettle}
      />
    </div>
  );
}

// ─── SettlementSection ────────────────────────────────────────────────────────

function SettlementSection({
  tone,
  icon,
  label,
  count,
  total,
  currency,
  children,
}: {
  tone: "positive" | "negative";
  icon: React.ReactNode;
  label: string;
  count: number;
  total: number;
  currency: string;
  children: React.ReactNode;
}) {
  const accent =
    tone === "positive"
      ? { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
      : { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" };

  return (
    <div className={cn("rounded-2xl border p-3 space-y-2", accent.border, accent.bg)}>
      <div className="flex items-center justify-between gap-3 px-1">
        <span className={cn("flex items-center gap-1.5 text-sm font-semibold", accent.text)}>
          {icon}
          {label}
          <span className="text-xs opacity-70 font-normal">({count})</span>
        </span>
        <span className={cn("text-sm font-bold tabular-nums", accent.text)}>
          {tone === "positive" ? "+" : "-"}
          {formatCurrency(total, currency)}
        </span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

// ─── BalanceRow (used in "Ils me doivent" / "Je leur dois") ───────────────────

function BalanceRow({
  participant,
  amount,
  currency,
  tone,
  onClick,
}: {
  participant: Participant;
  amount: number;
  currency: string;
  tone: "positive" | "negative";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-foreground/4 hover:bg-foreground/8 border border-foreground/8 active:scale-[0.99] transition-all text-left"
    >
      <ParticipantAvatar participant={participant} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">
          {participant.name}
        </p>
      </div>
      <span
        className={cn(
          "text-base font-bold tabular-nums shrink-0",
          tone === "positive" ? "text-emerald-400" : "text-red-400"
        )}
      >
        {tone === "positive" ? "+" : "-"}
        {formatCurrency(amount, currency)}
      </span>
    </button>
  );
}

// ─── ThirdPartyRow (used inside "Entre les autres" collapsible) ───────────────

function ThirdPartyRow({
  from,
  to,
  amount,
  currency,
  onSettle,
}: {
  from: Participant;
  to: Participant;
  amount: number;
  currency: string;
  onSettle: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onSettle();
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-foreground/4 hover:bg-foreground/8 border border-foreground/8 active:scale-[0.99] transition-all text-left"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: from.color }}
          />
          <span className="text-sm text-slate-200 truncate">{from.name}</span>
        </span>
        <ArrowUpRight size={12} className="text-slate-500 shrink-0" />
        <span className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: to.color }}
          />
          <span className="text-sm text-slate-200 truncate">{to.name}</span>
        </span>
        <span className="text-sm font-semibold text-slate-300 tabular-nums shrink-0">
          {formatCurrency(amount, currency)}
        </span>
      </button>

      <Dialog open={confirming} onOpenChange={(o) => { if (!o && !loading) setConfirming(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Marquer comme réglé ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400 py-2">
            {from.name} a remboursé {to.name} de{" "}
            <span className="text-slate-200 font-semibold tabular-nums">
              {formatCurrency(amount, currency)}
            </span>
            .
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirming(false)}
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

// ─── SettleDebtDialog ─────────────────────────────────────────────────────────

function SettleDebtDialog({
  settlement,
  from,
  to,
  currency,
  onClose,
  onSettle,
}: {
  settlement: Settlement | null;
  from: Participant | null;
  to: Participant | null;
  currency: string;
  onClose: () => void;
  onSettle: (s: Settlement) => Promise<void>;
}) {
  const { info, loading: loadingInfo } = usePaymentInfo(to?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [shared, setShared] = useState<null | "shared" | "copied">(null);

  const handleConfirm = async () => {
    if (!settlement) return;
    setLoading(true);
    try {
      await onSettle(settlement);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!to || !settlement) return;
    const result = await sharePaymentInfo({
      recipientName: to.name,
      iban: info?.iban ?? null,
      phone: info?.phone ?? null,
      amount: settlement.amount,
      currencyLabel: currencySymbol(currency),
    });
    if (result !== "cancelled") {
      setShared(result);
      setTimeout(() => setShared(null), 1800);
    }
  };

  return (
    <Dialog
      open={!!settlement}
      onOpenChange={(o) => { if (!o && !loading) onClose(); }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Régler ma dette</DialogTitle>
        </DialogHeader>

        {settlement && from && to && (
          <div className="py-2 space-y-4">
            <div className="glass-subtle rounded-xl px-4 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: from.color }}
                />
                <span className="font-semibold text-slate-100">{from.name}</span>
                <span className="text-slate-500 text-sm">rembourse</span>
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: to.color }}
                />
                <span className="font-semibold text-slate-100">{to.name}</span>
              </div>
              <p className="text-2xl font-bold text-section-soft tabular-nums">
                {formatCurrency(settlement.amount, currency)}
              </p>
            </div>

            {loadingInfo ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 size={14} className="animate-spin text-slate-500" />
              </div>
            ) : info && (info.iban || info.phone) ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Infos de {to.name}
                </p>
                {info.iban && (
                  <CopyRow label="IBAN" display={formatIban(info.iban)} raw={info.iban} mono />
                )}
                {info.phone && (
                  <CopyRow label="Téléphone" display={info.phone} raw={info.phone} />
                )}
                <CopyRow
                  label="Montant"
                  display={formatCurrency(settlement.amount, currency)}
                  raw={settlement.amount.toFixed(2)}
                  mono
                />
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold border border-section bg-section-soft text-section-soft hover:bg-section-medium transition-colors active:scale-[0.99]"
                >
                  {shared === "shared" ? <><Check size={14} /> Partagé</>
                    : shared === "copied" ? <><Check size={14} /> Copié</>
                    : canNativeShare() ? "Partager pour rembourser"
                    : "Copier toutes les infos"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">
                {to.name} n&apos;a pas renseigné ses infos de paiement.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="gradient-primary text-white border-0"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : "C'est réglé"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CopyRow({
  label,
  display,
  raw,
  mono = false,
}: {
  label: string;
  display: string;
  raw: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* */
    }
  };
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-foreground/8 bg-foreground/4">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          {label}
        </p>
        <p className={cn("text-sm text-slate-100 truncate", mono && "font-mono tracking-wide")}>
          {display}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="text-xs text-section-soft hover:text-section font-semibold px-2 py-1 rounded-md hover:bg-foreground/8 transition-colors"
      >
        {copied ? <Check size={14} className="text-emerald-400" /> : "Copier"}
      </button>
    </div>
  );
}
