"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Loader2, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { spring } from "@/lib/motion";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/budget/categories";
import { computeShares } from "@/lib/budget/splits";
import { currencySymbol } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import type {
  Expense,
  ExpenseCategory,
  Participant,
  ParticipantSplit,
  Payer,
  SplitMode,
} from "@/types";

type SplitState = ParticipantSplit & { pinned: boolean };

// ─── Pure rebalance helpers ───────────────────────────────────────────────────

function rebalanceFixed(splits: SplitState[], amount: number): SplitState[] {
  const active = splits.filter((s) => !s.excluded);
  const pinned = active.filter((s) => s.pinned);
  const free = active.filter((s) => !s.pinned);
  const pinnedSum = pinned.reduce((sum, s) => sum + (s.fixedAmount ?? 0), 0);
  const remaining = Math.max(0, amount - pinnedSum);
  const distributed = distributeCents(remaining, free.length);
  const freeMap = new Map(free.map((s, i) => [s.participantId, distributed[i] ?? 0]));
  return splits.map((s) => {
    if (s.excluded || s.pinned) return s;
    return { ...s, fixedAmount: freeMap.get(s.participantId) ?? 0 };
  });
}

function rebalancePct(splits: SplitState[]): SplitState[] {
  const active = splits.filter((s) => !s.excluded);
  const pinned = active.filter((s) => s.pinned);
  const free = active.filter((s) => !s.pinned);
  const pinnedSum = pinned.reduce((sum, s) => sum + (s.percentage ?? 0), 0);
  const remaining = Math.max(0, 100 - pinnedSum);
  const freePct =
    free.length > 0 ? Math.round((remaining / free.length) * 100) / 100 : 0;
  return splits.map((s) => {
    if (s.excluded || s.pinned) return s;
    return { ...s, percentage: freePct };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (n: number, currency: string) => {
  const rounded = Math.round(n * 100) / 100;
  const decimals = rounded % 1 === 0 ? 0 : 2;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  }).format(rounded);
};

function distributeCents(total: number, count: number): number[] {
  if (count === 0) return [];
  const cents = Math.round(total * 100);
  const baseCents = Math.floor(cents / count);
  const remainder = cents - baseCents * count;
  return Array.from(
    { length: count },
    (_, i) => (baseCents + (i < remainder ? 1 : 0)) / 100
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type NavTab = "Infos" | "Payé par" | "Pour qui";
const NAV_TABS: NavTab[] = ["Infos", "Payé par", "Pour qui"];

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: Participant[];
  currency: string;
  /** Participant ID pre-selected as payer in create mode (typically the current user). */
  defaultPayerId?: string | null;
  initialValues?: Expense;
  onSubmit: (data: {
    title: string;
    amount: number;
    currency: string;
    exchangeRate: number;
    category: ExpenseCategory;
    payers: Payer[];
    date: string;
    splitMode: SplitMode;
    splits: ParticipantSplit[];
  }) => Promise<void>;
}

export function ExpenseForm({
  open,
  onOpenChange,
  participants,
  currency,
  defaultPayerId,
  initialValues,
  onSubmit,
}: ExpenseFormProps) {
  const isEdit = !!initialValues;

  const [activeTab, setActiveTab] = useState<NavTab>("Infos");
  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [splits, setSplits] = useState<SplitState[]>([]);
  const [newMemberIds, setNewMemberIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // ── Hydration ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setActiveTab("Infos");

    if (initialValues) {
      setTitle(initialValues.title);
      setAmountStr(initialValues.amount.toString().replace(".", ","));
      setCategory(initialValues.category);
      setDate(initialValues.date);
      setSplitMode(initialValues.splitMode);
      setPayers(
        initialValues.payers.map((p) => ({
          ...p,
          amount: p.amount / (initialValues.exchangeRate || 1),
        }))
      );

      const existingByParticipant = new Map(
        initialValues.splits
          .filter((s) => participants.some((p) => p.id === s.participantId))
          .map((s) => [s.participantId, s])
      );
      const merged: SplitState[] = participants.map((p) => {
        const existing = existingByParticipant.get(p.id);
        if (existing) return { ...existing, pinned: false };
        return {
          participantId: p.id,
          excluded: true,
          percentage: 0,
          fixedAmount: 0,
          share: 0,
          pinned: false,
        };
      });
      setSplits(merged);
      setNewMemberIds(
        new Set(
          participants
            .filter((p) => !existingByParticipant.has(p.id))
            .map((p) => p.id)
        )
      );
    } else {
      setTitle("");
      setAmountStr("");
      setCategory("other");
      setDate(new Date().toISOString().split("T")[0]);
      setSplitMode("equal");
      setNewMemberIds(new Set());
      // Default payer = current user's participant if known, else first participant
      const defaultPayer =
        (defaultPayerId && participants.find((p) => p.id === defaultPayerId)) ||
        participants[0];
      setPayers(
        defaultPayer ? [{ participantId: defaultPayer.id, amount: 0 }] : []
      );
      setSplits(
        participants.map((p) => ({
          participantId: p.id,
          excluded: false,
          percentage: participants.length > 0 ? 100 / participants.length : 0,
          fixedAmount: 0,
          share: 0,
          pinned: false,
        }))
      );
    }
  }, [open, initialValues, participants, defaultPayerId]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const amount = useMemo(() => {
    const cleaned = amountStr.replace(",", ".").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amountStr]);

  const computedSplits = useMemo(
    () =>
      computeShares(
        amount,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        splits.map(({ pinned: _pinned, ...s }) => s),
        splitMode
      ),
    [amount, splits, splitMode]
  );

  const splitTotal = useMemo(() => {
    const active = splits.filter((s) => !s.excluded);
    if (splitMode === "percentage")
      return active.reduce((acc, s) => acc + (s.percentage ?? 0), 0);
    if (splitMode === "fixed")
      return active.reduce((acc, s) => acc + (s.fixedAmount ?? 0), 0);
    return 0;
  }, [splits, splitMode]);

  const activeCount = splits.filter((s) => !s.excluded).length;

  const splitValid =
    activeCount > 0 &&
    (splitMode === "equal"
      ? true
      : splitMode === "percentage"
      ? Math.abs(splitTotal - 100) < 0.01
      : Math.abs(splitTotal - amount) < 0.01);

  const payerTotal = payers.reduce((acc, p) => acc + p.amount, 0);
  const payerValid =
    payers.length > 0 &&
    (payers.length === 1 || Math.abs(payerTotal - amount) < 0.01);

  const formValid =
    title.trim().length > 0 && amount > 0 && payerValid && splitValid;

  // ── Amount effect (fixed mode) ─────────────────────────────────────────────
  useEffect(() => {
    if (splitMode !== "fixed" || !amount) return;
    setSplits((prev) => {
      const active = prev.filter((s) => !s.excluded);
      const allZero = active.every((s) => (s.fixedAmount ?? 0) < 0.005);
      if (!allZero) return prev;
      return rebalanceFixed(prev, amount);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, splitMode]);

  // ── Payer effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (payers.length <= 1 || !amount) return;
    const distributed = distributeCents(amount, payers.length);
    setPayers((prev) => prev.map((p, i) => ({ ...p, amount: distributed[i] ?? 0 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const togglePayer = (participantId: string) => {
    setPayers((prev) => {
      const exists = prev.some((p) => p.participantId === participantId);
      let next: Payer[];
      if (exists) {
        if (prev.length <= 1) return prev;
        next = prev.filter((p) => p.participantId !== participantId);
      } else {
        next = [...prev, { participantId, amount: 0 }];
      }
      const distributed = distributeCents(amount, next.length);
      return next.map((p, i) => ({ ...p, amount: distributed[i] ?? 0 }));
    });
  };

  const setPayerAmount = (participantId: string, value: number) => {
    setPayers((prev) => {
      const others = prev.filter((p) => p.participantId !== participantId);
      const newValue = Math.max(0, value);
      const remaining = Math.max(0, amount - newValue);
      const distributed = distributeCents(remaining, others.length);
      return prev.map((p) => {
        if (p.participantId === participantId) return { ...p, amount: newValue };
        const idx = others.findIndex((o) => o.participantId === p.participantId);
        return { ...p, amount: distributed[idx] ?? 0 };
      });
    });
  };

  const toggleInclusion = (participantId: string) => {
    setSplits((prev) => {
      const toggled = prev.map((s) =>
        s.participantId === participantId
          ? { ...s, excluded: !s.excluded, pinned: false }
          : s
      );
      if (splitMode === "fixed") return rebalanceFixed(toggled, amount);
      if (splitMode === "percentage") return rebalancePct(toggled);
      return toggled;
    });
  };

  const setFixedAmount = (participantId: string, value: number) => {
    setSplits((prev) => {
      const withPin = prev.map((s) =>
        s.participantId === participantId
          ? { ...s, fixedAmount: Math.max(0, value), pinned: true }
          : s
      );
      return rebalanceFixed(withPin, amount);
    });
  };

  const unpinFixed = (participantId: string) => {
    setSplits((prev) => {
      const unpinned = prev.map((s) =>
        s.participantId === participantId ? { ...s, pinned: false } : s
      );
      return rebalanceFixed(unpinned, amount);
    });
  };

  const setPercentage = (participantId: string, value: number) => {
    setSplits((prev) => {
      const withPin = prev.map((s) =>
        s.participantId === participantId
          ? { ...s, percentage: Math.max(0, Math.min(100, value)), pinned: true }
          : s
      );
      return rebalancePct(withPin);
    });
  };

  const unpinPct = (participantId: string) => {
    setSplits((prev) => {
      const unpinned = prev.map((s) =>
        s.participantId === participantId ? { ...s, pinned: false } : s
      );
      return rebalancePct(unpinned);
    });
  };

  const handleSplitModeChange = (mode: string) => {
    const newMode = mode as SplitMode;
    setSplitMode(newMode);
    setSplits((prev) => {
      const cleared = prev.map((s) => ({ ...s, pinned: false }));
      if (newMode === "percentage") return rebalancePct(cleared);
      if (newMode === "fixed") return rebalanceFixed(cleared, amount);
      return cleared;
    });
  };

  const handleEqualForAll = () => {
    setSplitMode("equal");
    setSplits((prev) => prev.map((s) => ({ ...s, excluded: false, pinned: false })));
  };

  const handleSubmit = async () => {
    if (!formValid) return;
    setSubmitting(true);
    try {
      const finalPayers =
        payers.length === 1
          ? [{ participantId: payers[0].participantId, amount }]
          : payers;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const cleanSplits: ParticipantSplit[] = splits.map(({ pinned: _p, ...s }) => s);
      await onSubmit({
        title: title.trim(),
        amount,
        currency,
        exchangeRate: 1,
        category,
        payers: finalPayers,
        date,
        splitMode,
        splits: cleanSplits,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const sym = currencySymbol(currency);

  // ── Tab validity indicators ────────────────────────────────────────────────
  const infoValid = title.trim().length > 0 && amount > 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 flex flex-col overflow-hidden"
        style={{ height: "92dvh" }}
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-7 pr-16 pb-3">
          <SheetTitle>{isEdit ? "Modifier la dépense" : "Nouvelle dépense"}</SheetTitle>
        </div>

        {/* Tab navigation */}
        <div role="tablist" className="mx-5 mb-1 flex h-11 shrink-0 gap-1 rounded-full bg-foreground/[0.06] p-1">
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab;
            const hasIssue =
              (tab === "Infos" && !infoValid && (title.length > 0 || amount > 0)) ||
              (tab === "Payé par" && !payerValid && amount > 0) ||
              (tab === "Pour qui" && !splitValid && amount > 0);
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="expense-form-tab"
                    transition={spring}
                    className="absolute inset-0 rounded-full bg-card shadow-card dark:bg-foreground/[0.12]"
                  />
                )}
                <span className="relative">{tab}</span>
                {hasIssue && <span className="relative size-1.5 rounded-full bg-amber-400" aria-label="à compléter" />}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">

          {/* ── Infos ── */}
          {activeTab === "Infos" && (
            <>
              <div className="py-3 text-center">
                <label htmlFor="expense-amount" className="text-sm font-medium text-muted-foreground">Montant</label>
                <input
                  id="expense-amount"
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) =>
                    setAmountStr(e.target.value.replace(/[^0-9.,]/g, ""))
                  }
                  placeholder={`0,00 ${sym}`}
                  className="tabular mt-1 w-full bg-transparent text-center font-display text-[3.75rem] leading-none font-extrabold tracking-[-0.04em] text-foreground placeholder:text-foreground/20 focus:outline-none"
                  autoFocus={!isEdit}
                  onFocus={(e) => e.target.select()}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="expense-title" className="px-1 text-sm font-semibold">Pour quoi ?</label>
                <Input
                  id="expense-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Restaurant, courses, taxi…"
                />
              </div>

              <div className="space-y-2">
                <p className="px-1 text-sm font-semibold">Catégorie</p>
                <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                  {CATEGORY_ORDER.map((cat) => {
                    const cfg = CATEGORIES[cat];
                    const Icon = cfg.icon;
                    const selected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        aria-pressed={selected}
                        className={cn(
                          "pressable flex h-11 shrink-0 items-center gap-2 rounded-full pr-4 pl-3 transition-colors",
                          selected
                            ? "bg-foreground text-background"
                            : "bg-foreground/[0.06] text-foreground hover:bg-foreground/10"
                        )}
                      >
                        <Icon size={17} className={selected ? undefined : cfg.color} />
                        <span className="text-sm font-semibold whitespace-nowrap">
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="expense-date" className="px-1 text-sm font-semibold">Date</label>
                <Input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </>
          )}

          {/* ── Payé par ── */}
          {activeTab === "Payé par" && (
            <div className="space-y-4">
              <p className="px-1 text-sm text-muted-foreground">Qui a avancé l&apos;argent ? Sélectionne plusieurs personnes pour partager le paiement.</p>
              <div className="flex flex-wrap gap-2">
                {participants.map((p) => {
                  const selected = payers.some((py) => py.participantId === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePayer(p.id)}
                      aria-pressed={selected}
                      className={cn(
                        "pressable flex h-11 items-center gap-2 rounded-full pr-4 pl-1.5 transition-colors",
                        selected
                          ? "bg-primary text-primary-foreground shadow-section"
                          : "bg-foreground/[0.06] text-foreground hover:bg-foreground/10"
                      )}
                    >
                      <ParticipantAvatar participant={p} size="sm" className={selected ? "ring-primary" : undefined} />
                      <span className="text-sm font-semibold">{p.name}</span>
                    </button>
                  );
                })}
              </div>

              {payers.length > 1 && (
                <div className="space-y-1.5 mt-1">
                  {payers.map((payer) => {
                    const p = participants.find(
                      (part) => part.id === payer.participantId
                    );
                    if (!p) return null;
                    return (
                      <div
                        key={payer.participantId}
                        className="flex items-center gap-3 rounded-2xl bg-secondary px-3 py-2"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="flex-1 truncate text-[0.95rem] font-medium">{p.name}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={payer.amount}
                          onChange={(e) =>
                            setPayerAmount(
                              payer.participantId,
                              Number(e.target.value) || 0
                            )
                          }
                          onFocus={(e) => e.target.select()}
                          className="tabular h-10 w-24 rounded-xl border border-input bg-card px-3 text-right text-base outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/12"
                        />
                        <span className="text-xs text-slate-500 w-8">{sym}</span>
                      </div>
                    );
                  })}
                  <p
                    className={cn(
                      "text-center text-sm font-medium",
                      Math.abs(payerTotal - amount) < 0.01
                        ? "text-emerald-400"
                        : "text-amber-400"
                    )}
                  >
                    {Math.abs(payerTotal - amount) < 0.01
                      ? "Répartition correcte ✓"
                      : `Total : ${formatCurrency(payerTotal, currency)} / ${formatCurrency(amount, currency)}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Pour qui ── */}
          {activeTab === "Pour qui" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="px-1 text-sm font-semibold">Répartition</p>
                <button
                  type="button"
                  onClick={handleEqualForAll}
                  className="pressable h-9 rounded-full bg-primary/10 px-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                >
                  Tous — équitable
                </button>
              </div>

              {newMemberIds.size > 0 && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-amber-500/12 px-3.5 py-3 text-sm text-amber-200">
                  <UserPlus size={16} className="mt-0.5 shrink-0" />
                  <span>
                    {newMemberIds.size === 1
                      ? "Un nouveau membre a rejoint le voyage. Coche-le si cette dépense le concerne."
                      : `${newMemberIds.size} nouveaux membres ont rejoint le voyage. Coche-les si cette dépense les concerne.`}
                  </span>
                </div>
              )}

              <Tabs value={splitMode} onValueChange={handleSplitModeChange}>
                <TabsList className="grid w-full grid-cols-3 bg-foreground/[0.06]">
                  <TabsTrigger value="equal">Équitable</TabsTrigger>
                  <TabsTrigger value="percentage">Pourcentages</TabsTrigger>
                  <TabsTrigger value="fixed">Montants</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-2">
                {participants.map((p) => {
                  const split = splits.find((s) => s.participantId === p.id);
                  if (!split) return null;
                  const computed = computedSplits.find(
                    (s) => s.participantId === p.id
                  );
                  const share = computed?.share ?? 0;
                  const isNew = newMemberIds.has(p.id);

                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2 transition-[background-color,opacity]",
                        split.excluded
                          ? isNew
                            ? "bg-amber-500/10 ring-1 ring-amber-500/30 ring-inset"
                            : "bg-secondary/60 opacity-55"
                          : "bg-secondary"
                      )}
                    >
                      {splitMode === "equal" && (
                        <button
                          type="button"
                          onClick={() => toggleInclusion(p.id)}
                          role="checkbox"
                          aria-checked={!split.excluded}
                          aria-label={`Inclure ${p.name}`}
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                            split.excluded ? "border-foreground/25" : "border-primary bg-primary"
                          )}
                        >
                          {!split.excluded && (
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M3 8l3 3 7-7"
                                stroke="white"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      )}

                      <ParticipantAvatar participant={p} size="sm" />
                      <span className="truncate text-[0.95rem] font-medium">{p.name}</span>
                      {isNew && (
                        <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                          Nouveau
                        </span>
                      )}
                      <span className="flex-1" />

                      {splitMode === "equal" && (
                        <span className="tabular text-[0.95rem] font-semibold">
                          {split.excluded ? "—" : formatCurrency(share, currency)}
                        </span>
                      )}

                      {splitMode === "percentage" && (
                        <div className="flex items-center gap-1.5">
                          {split.pinned && !split.excluded && (
                            <button
                              type="button"
                              onClick={() => unpinPct(p.id)}
                              title="Désancrer"
                              className="text-section opacity-70 hover:opacity-100 transition-opacity shrink-0"
                            >
                              <Lock size={13} />
                            </button>
                          )}
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            min="0"
                            max="100"
                            value={split.percentage ?? 0}
                            onChange={(e) =>
                              setPercentage(p.id, Number(e.target.value) || 0)
                            }
                            onFocus={(e) => e.target.select()}
                            className={cn(
                              "tabular h-10 w-16 rounded-xl border px-2 text-right text-base outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/12",
                              split.pinned && !split.excluded
                                ? "border-primary/40 bg-primary/10"
                                : "border-input bg-card"
                            )}
                          />
                          <span className="text-xs text-slate-500">%</span>
                          <span className="text-xs text-slate-400 w-16 text-right tabular-nums">
                            {formatCurrency(share, currency)}
                          </span>
                        </div>
                      )}

                      {splitMode === "fixed" && (
                        <div className="flex items-center gap-1.5">
                          {split.pinned && !split.excluded && (
                            <button
                              type="button"
                              onClick={() => unpinFixed(p.id)}
                              title="Désancrer"
                              className="text-section opacity-70 hover:opacity-100 transition-opacity shrink-0"
                            >
                              <Lock size={13} />
                            </button>
                          )}
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={split.fixedAmount ?? 0}
                            onChange={(e) =>
                              setFixedAmount(p.id, Number(e.target.value) || 0)
                            }
                            onFocus={(e) => e.target.select()}
                            className={cn(
                              "tabular h-10 w-24 rounded-xl border px-3 text-right text-base outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/12",
                              split.pinned && !split.excluded
                                ? "border-primary/40 bg-primary/10"
                                : "border-input bg-card"
                            )}
                          />
                          <span className="text-xs text-slate-500 w-6">{sym}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <SplitTotalFeedback
                mode={splitMode}
                splitTotal={splitTotal}
                amount={amount}
                activeCount={activeCount}
                currency={currency}
              />
            </div>
          )}
        </div>

        {/* Footer — toujours visible */}
        <div className="shrink-0 border-t border-border bg-popover px-5 pt-3 pb-4">
          <div className="flex gap-2">
            <Button variant="secondary" size="lg" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!formValid || submitting}
              className="flex-[2] shadow-section disabled:shadow-none"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : isEdit ? "Enregistrer" : "Ajouter la dépense"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── SplitTotalFeedback ───────────────────────────────────────────────────────

function SplitTotalFeedback({
  mode,
  splitTotal,
  amount,
  activeCount,
  currency,
}: {
  mode: SplitMode;
  splitTotal: number;
  amount: number;
  activeCount: number;
  currency: string;
}) {
  if (activeCount === 0) {
    return (
      <p className="text-center text-sm font-medium text-amber-400">
        Sélectionne au moins un bénéficiaire
      </p>
    );
  }

  if (mode === "equal") {
    const each = amount > 0 ? amount / activeCount : 0;
    return (
      <p className="text-center text-sm text-muted-foreground">
        Réparti entre {activeCount} personne{activeCount !== 1 ? "s" : ""}
        {amount > 0 && (
          <>
            {" · "}
            <span className="font-semibold text-foreground">
              {formatCurrency(each, currency)} chacun
            </span>
          </>
        )}
      </p>
    );
  }

  if (mode === "percentage") {
    const diff = splitTotal - 100;
    const ok = Math.abs(diff) < 0.01;
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-1.5 text-center text-sm font-medium",
          ok ? "text-emerald-400" : "text-amber-400"
        )}
      >
        {ok ? (
          <>Total : 100% ✓</>
        ) : (
          <>
            Total : {Math.round(splitTotal * 10) / 10}%
            <span className="text-slate-500">
              ({diff > 0 ? "+" : ""}
              {Math.round(diff * 10) / 10}%)
            </span>
          </>
        )}
      </div>
    );
  }

  const diff = splitTotal - amount;
  const ok = Math.abs(diff) < 0.01;
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 text-center text-sm font-medium",
        ok ? "text-emerald-400" : "text-amber-400"
      )}
    >
      {ok ? (
        <>Total : {formatCurrency(splitTotal, currency)} ✓</>
      ) : (
        <>
          Total : {formatCurrency(splitTotal, currency)}
          <span className="text-slate-500">
            ({diff > 0 ? "+" : ""}
            {formatCurrency(diff, currency)})
          </span>
        </>
      )}
    </div>
  );
}
