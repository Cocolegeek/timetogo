"use client";

import { useState } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown, ChevronRight, Check, Loader2 } from "lucide-react";
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
import { SectionLabel } from "@/components/shared/SectionLabel";
import { NumberTicker } from "@/components/motion/NumberTicker";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { EASE_OUT, spring } from "@/lib/motion";
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

  const net = myBalance?.net ?? 0;
  const formatMoney = (n: number) => formatCurrency(n, currency);

  return (
    <Stagger step={0.05} className="space-y-6">
      {myId && myBalance && (
        <StaggerItem>
          <div
            className={cn(
              "rounded-[1.75rem] p-5",
              meSettled ? "bg-emerald-500/12" : net > 0 ? "bg-emerald-500/12" : "bg-rose-500/12"
            )}
          >
            {meSettled ? (
              <IAmSettledEmpty />
            ) : (
              <>
                <p className={cn("text-sm font-semibold", net > 0 ? "text-emerald-300" : "text-rose-300")}>
                  {net > 0 ? "En tout, on te doit" : "En tout, tu dois"}
                </p>
                <NumberTicker
                  value={Math.abs(net)}
                  format={formatMoney}
                  className={cn(
                    "tabular mt-1 block font-display text-[2.75rem] leading-none font-extrabold tracking-[-0.035em]",
                    net > 0 ? "text-emerald-200" : "text-rose-200"
                  )}
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  {net > 0
                    ? `${theyOweMe.length} personne${theyOweMe.length > 1 ? "s" : ""} à relancer`
                    : `${iOweThem.length} virement${iOweThem.length > 1 ? "s" : ""} à faire`}
                </p>
              </>
            )}
          </div>
        </StaggerItem>
      )}

      {iOweThem.length > 0 && (
        <StaggerItem>
          <SectionLabel>Tu dois</SectionLabel>
          <ul className="overflow-hidden rounded-[1.5rem] bg-card shadow-card">
            {iOweThem.map((s, i) => {
              const to = participantBy(s.toId);
              if (!to) return null;
              return (
                <BalanceRow
                  key={`${s.fromId}-${s.toId}`}
                  participant={to}
                  amount={formatMoney(s.amount)}
                  tone="negative"
                  first={i === 0}
                  onClick={() => setDebtTarget(s)}
                  action="Régler"
                />
              );
            })}
          </ul>
        </StaggerItem>
      )}

      {theyOweMe.length > 0 && (
        <StaggerItem>
          <SectionLabel>On te doit</SectionLabel>
          <ul className="overflow-hidden rounded-[1.5rem] bg-card shadow-card">
            {theyOweMe.map((s, i) => {
              const from = participantBy(s.fromId);
              if (!from) return null;
              return (
                <BalanceRow
                  key={`${s.fromId}-${s.toId}`}
                  participant={from}
                  amount={formatMoney(s.amount)}
                  tone="positive"
                  first={i === 0}
                  onClick={() => setOpenParticipant(from)}
                />
              );
            })}
          </ul>
        </StaggerItem>
      )}

      {otherSettlements.length > 0 && (
        <StaggerItem>
          <div className="overflow-hidden rounded-[1.5rem] bg-card shadow-card">
            <button
              type="button"
              onClick={() => setOthersOpen((v) => !v)}
              aria-expanded={othersOpen}
              className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03]"
            >
              <span className="flex items-center gap-2 font-semibold">
                {myId ? "Entre les autres" : "Remboursements"}
                <span className="tabular rounded-full bg-foreground/[0.07] px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {otherSettlements.length}
                </span>
              </span>
              <motion.span animate={{ rotate: othersOpen ? 180 : 0 }} transition={spring}>
                <ChevronDown size={18} className="text-muted-foreground" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {othersOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className="overflow-hidden"
                >
                  <ul className="border-t border-border">
                    {otherSettlements.map((s, i) => {
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
                          first={i === 0}
                          onSettle={() => onSettle(s)}
                        />
                      );
                    })}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </StaggerItem>
      )}

      {balances.length > 0 && (
        <StaggerItem>
          <SectionLabel>Tous les soldes</SectionLabel>
          {(() => {
            const max = Math.max(...balances.map((b) => Math.abs(b.net)), 0.01);
            const sorted = [...balances].sort((a, b) => b.net - a.net);
            return (
              <div className="overflow-hidden rounded-[1.5rem] bg-card shadow-card">
                {sorted.map((balance, i) => {
                  const p = participantBy(balance.participantId);
                  if (!p) return null;
                  const isCreditor = balance.net > 0.005;
                  const isDebtor = balance.net < -0.005;
                  const width = `${(Math.abs(balance.net) / max) * 100}%`;
                  return (
                    <button
                      key={balance.participantId}
                      type="button"
                      onClick={() => setOpenParticipant(p)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03]",
                        i > 0 && "border-t border-border"
                      )}
                    >
                      <ParticipantAvatar participant={p} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[0.95rem] font-medium">
                            {p.name}
                            {p.id === myId && <span className="ml-1.5 text-sm font-normal text-muted-foreground">toi</span>}
                          </span>
                          <span
                            className={cn(
                              "tabular shrink-0 text-sm font-semibold",
                              isCreditor ? "text-emerald-400" : isDebtor ? "text-rose-400" : "text-muted-foreground"
                            )}
                          >
                            {isCreditor ? "+" : isDebtor ? "−" : ""}
                            {formatMoney(Math.abs(balance.net))}
                          </span>
                        </span>
                        {/* Diverging bar from the centre: left = owes the group, right = is owed. */}
                        <span aria-hidden="true" className="relative mt-2 flex h-1.5 items-center rounded-full bg-foreground/[0.06]">
                          <span className="absolute -inset-y-1 left-1/2 w-px bg-foreground/20" />
                          <span className="flex h-full w-1/2 justify-end">
                            {isDebtor && (
                              <motion.span
                                initial={{ width: 0 }}
                                animate={{ width }}
                                transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.1 + i * 0.04 }}
                                className="h-full rounded-l-full bg-rose-500"
                              />
                            )}
                          </span>
                          <span className="flex h-full w-1/2">
                            {isCreditor && (
                              <motion.span
                                initial={{ width: 0 }}
                                animate={{ width }}
                                transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.1 + i * 0.04 }}
                                className="h-full rounded-r-full bg-emerald-500"
                              />
                            )}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </StaggerItem>
      )}

      <ParticipantPaymentSheet
        open={!!openParticipant}
        onOpenChange={(open) => { if (!open) setOpenParticipant(null); }}
        participant={openParticipant}
      />

      <SettleDebtDialog
        settlement={debtTarget}
        from={debtTarget ? participantBy(debtTarget.fromId) ?? null : null}
        to={debtTarget ? participantBy(debtTarget.toId) ?? null : null}
        currency={currency}
        onClose={() => setDebtTarget(null)}
        onSettle={onSettle}
      />
    </Stagger>
  );
}

// ─── BalanceRow ───────────────────────────────────────────────────────────────

function BalanceRow({
  participant,
  amount,
  tone,
  first,
  onClick,
  action,
}: {
  participant: Participant;
  amount: string;
  tone: "positive" | "negative";
  first?: boolean;
  onClick: () => void;
  action?: string;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3.5 px-4 text-left transition-colors active:bg-secondary"
      >
        <ParticipantAvatar participant={participant} size="md" />
        <span className={cn("flex min-w-0 flex-1 items-center gap-3 py-3.5", !first && "border-t border-border")}>
          <span className="min-w-0 flex-1 truncate font-semibold">{participant.name}</span>
          <span
            className={cn(
              "tabular shrink-0 font-display text-[1.0625rem] font-bold",
              tone === "positive" ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {amount}
          </span>
          {action ? (
            <span className="shrink-0 rounded-full bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground">{action}</span>
          ) : (
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
          )}
        </span>
      </button>
    </li>
  );
}

// ─── ThirdPartyRow (used inside "Entre les autres" collapsible) ───────────────

function ThirdPartyRow({
  from,
  to,
  amount,
  currency,
  first,
  onSettle,
}: {
  from: Participant;
  to: Participant;
  amount: number;
  currency: string;
  first?: boolean;
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
      <li>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex w-full items-center px-4 text-left transition-colors active:bg-secondary"
        >
          <span className={cn("flex min-w-0 flex-1 items-center gap-2.5 py-3.5", !first && "border-t border-border")}>
            <ParticipantAvatar participant={from} size="xs" />
            <span className="truncate text-[0.95rem] font-medium">{from.name}</span>
            <ArrowRight size={14} className="shrink-0 text-muted-foreground" />
            <ParticipantAvatar participant={to} size="xs" />
            <span className="min-w-0 flex-1 truncate text-[0.95rem] font-medium">{to.name}</span>
            <span className="tabular shrink-0 font-semibold">{formatCurrency(amount, currency)}</span>
          </span>
        </button>
      </li>

      <Dialog open={confirming} onOpenChange={(o) => { if (!o && !loading) setConfirming(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Marquer comme réglé ?</DialogTitle>
          </DialogHeader>
          <p className="text-[0.95rem] text-muted-foreground">
            {from.name} a remboursé {to.name} de{" "}
            <span className="tabular font-semibold text-foreground">
              {formatCurrency(amount, currency)}
            </span>
            .
          </p>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
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
          <div className="space-y-4">
            <div className="rounded-[1.25rem] bg-secondary px-4 py-5 text-center">
              <div className="flex items-center justify-center gap-2">
                <ParticipantAvatar participant={from} size="sm" />
                <ArrowRight size={16} className="text-muted-foreground" />
                <ParticipantAvatar participant={to} size="sm" />
              </div>
              <p className="tabular mt-3 font-display text-[2.25rem] leading-none font-extrabold tracking-tight">
                {formatCurrency(settlement.amount, currency)}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {from.name} rembourse {to.name}
              </p>
            </div>

            {loadingInfo ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            ) : info && (info.iban || info.phone) ? (
              <div className="space-y-2">
                <p className="px-1 text-sm font-semibold text-muted-foreground">Infos de {to.name}</p>
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
                  className="pressable flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                >
                  {shared === "shared" ? <><Check size={14} /> Partagé</>
                    : shared === "copied" ? <><Check size={14} /> Copié</>
                    : canNativeShare() ? "Partager pour rembourser"
                    : "Copier toutes les infos"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {to.name} n&apos;a pas renseigné ses infos de paiement.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
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
    <div className="flex items-center gap-3 rounded-2xl bg-secondary px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn("truncate text-[0.95rem] text-foreground", mono && "font-mono tracking-wide")}>
          {display}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex h-9 min-w-16 items-center justify-center rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        {copied ? <Check size={14} className="text-emerald-400" /> : "Copier"}
      </button>
    </div>
  );
}
