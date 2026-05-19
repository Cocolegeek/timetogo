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
import { Lock } from "lucide-react";
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

// ─── Local split state type ───────────────────────────────────────────────────
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

// ─── Component ────────────────────────────────────────────────────────────────

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: Participant[];
  currency: string;
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
  initialValues,
  onSubmit,
}: ExpenseFormProps) {
  const isEdit = !!initialValues;

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
      setPayers(
        participants[0]
          ? [{ participantId: participants[0].id, amount: 0 }]
          : []
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
  }, [open, initialValues, participants]);

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="glass-strong border-foreground/10 rounded-t-2xl p-0 flex flex-col overflow-hidden"
        style={{ height: "92dvh" }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-foreground/8 shrink-0 pr-14">
          <SheetTitle className="text-slate-100 text-xl font-bold">
            {isEdit ? "Modifier la dépense" : "Nouvelle dépense"}
          </SheetTitle>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* 1. Amount */}
          <div className="text-center">
            <input
              type="text"
              inputMode="decimal"
              value={amountStr}
              onChange={(e) =>
                setAmountStr(e.target.value.replace(/[^0-9.,]/g, ""))
              }
              placeholder={`0,00 ${sym}`}
              className="w-full text-center bg-transparent text-6xl font-bold text-slate-100 placeholder:text-slate-700 focus:outline-none tabular-nums"
              autoFocus={!isEdit}
              onFocus={(e) => e.target.select()}
            />
          </div>

          {/* 2. Description — no label, placeholder only */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Restaurant, courses, taxi…"
            className="bg-foreground/8 border-foreground/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-section text-base h-12"
          />

          {/* 3. Payé par */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Payé par
            </p>
            <div className="flex gap-2 flex-wrap">
              {participants.map((p) => {
                const selected = payers.some((py) => py.participantId === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePayer(p.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all active:scale-95",
                      selected
                        ? "border-section bg-section-soft text-section-soft"
                        : "border-foreground/10 bg-foreground/4 text-slate-300 hover:bg-foreground/8"
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-sm font-medium">{p.name}</span>
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
                      className="flex items-center gap-3 px-3 py-2 rounded-xl border border-foreground/8 bg-foreground/4"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="text-sm text-slate-200 flex-1 truncate">
                        {p.name}
                      </span>
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
                        className="w-20 text-right bg-foreground/8 border border-foreground/10 rounded-lg px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-section tabular-nums"
                      />
                      <span className="text-xs text-slate-500 w-8">{sym}</span>
                    </div>
                  );
                })}
                <p
                  className={cn(
                    "text-center text-xs",
                    Math.abs(payerTotal - amount) < 0.01
                      ? "text-emerald-400"
                      : "text-amber-400"
                  )}
                >
                  {Math.abs(payerTotal - amount) < 0.01
                    ? "Répartition correcte ✓"
                    : `Total payeurs : ${formatCurrency(payerTotal, currency)} / ${formatCurrency(amount, currency)}`}
                </p>
              </div>
            )}
          </div>

          {/* 4. Pour qui / répartition */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pour qui
              </p>
              <button
                type="button"
                onClick={handleEqualForAll}
                className="text-xs text-section-soft bg-section/8 border border-section/20 px-2.5 py-1 rounded-full hover:bg-section/15 transition-colors active:scale-95"
              >
                Tous — équitable
              </button>
            </div>

            {newMemberIds.size > 0 && (
              <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                <span className="text-base leading-none">👋</span>
                <span>
                  {newMemberIds.size === 1
                    ? "Un nouveau membre a rejoint le voyage. Coche-le si cette dépense le concerne."
                    : `${newMemberIds.size} nouveaux membres ont rejoint le voyage. Coche-les si cette dépense les concerne.`}
                </span>
              </div>
            )}

            <Tabs value={splitMode} onValueChange={handleSplitModeChange}>
              <TabsList className="grid grid-cols-3 w-full bg-foreground/4 border border-foreground/8">
                <TabsTrigger
                  value="equal"
                  className="data-[state=active]:bg-section-soft data-[state=active]:text-section"
                >
                  Équitable
                </TabsTrigger>
                <TabsTrigger
                  value="percentage"
                  className="data-[state=active]:bg-section-soft data-[state=active]:text-section"
                >
                  %
                </TabsTrigger>
                <TabsTrigger
                  value="fixed"
                  className="data-[state=active]:bg-section-soft data-[state=active]:text-section"
                >
                  Montants
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-1.5">
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
                      "flex items-center gap-3 px-3 py-2 rounded-xl border transition-all",
                      split.excluded
                        ? isNew
                          ? "border-amber-500/40 bg-amber-500/5"
                          : "border-foreground/4 bg-foreground/2 opacity-50"
                        : "border-foreground/8 bg-foreground/4"
                    )}
                  >
                    {/* Equal: checkbox */}
                    {splitMode === "equal" && (
                      <button
                        type="button"
                        onClick={() => toggleInclusion(p.id)}
                        className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                          split.excluded
                            ? "border-slate-600"
                            : "border-section bg-section"
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

                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-sm text-slate-200 truncate">{p.name}</span>
                    {isNew && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                        Nouveau
                      </span>
                    )}
                    <span className="flex-1" />

                    {splitMode === "equal" && (
                      <span className="text-sm font-medium text-slate-300 tabular-nums">
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
                            "w-16 text-right border rounded-lg px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-section tabular-nums",
                            split.pinned && !split.excluded
                              ? "bg-section/10 border-section/40"
                              : "bg-foreground/8 border-foreground/10"
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
                            "w-20 text-right border rounded-lg px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-section tabular-nums",
                            split.pinned && !split.excluded
                              ? "bg-section/10 border-section/40"
                              : "bg-foreground/8 border-foreground/10"
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

          {/* 5. Catégorie — horizontal scroll */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Catégorie
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-none">
              {CATEGORY_ORDER.map((cat) => {
                const cfg = CATEGORIES[cat];
                const Icon = cfg.icon;
                const selected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all active:scale-95",
                      selected
                        ? cn(cfg.bg, cfg.color, "border-current ring-1", cfg.ring)
                        : "bg-foreground/4 border-foreground/8 text-slate-400 hover:bg-foreground/8"
                    )}
                  >
                    <Icon size={16} />
                    <span className="text-xs font-medium whitespace-nowrap">
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Date */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Date
            </p>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-foreground/8 border-foreground/10 text-slate-100 [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t border-foreground/8 bg-slate-900/50 shrink-0"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-slate-400 hover:text-slate-200 hover:bg-foreground/8"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formValid || submitting}
              className="flex-1 gradient-primary text-white border-0 disabled:opacity-40"
            >
              {submitting ? "…" : isEdit ? "Modifier" : "Ajouter"}
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
      <p className="text-center text-xs text-amber-400">
        Sélectionne au moins un bénéficiaire
      </p>
    );
  }

  if (mode === "equal") {
    const each = amount > 0 ? amount / activeCount : 0;
    return (
      <p className="text-center text-xs text-slate-500">
        Réparti entre {activeCount} personne{activeCount !== 1 ? "s" : ""}
        {amount > 0 && (
          <>
            {" · "}
            <span className="text-slate-300 font-medium">
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
          "text-center text-xs flex items-center justify-center gap-1.5",
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

  // fixed
  const diff = splitTotal - amount;
  const ok = Math.abs(diff) < 0.01;
  return (
    <div
      className={cn(
        "text-center text-xs flex items-center justify-center gap-1.5",
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
