"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { HeroInput } from "@/components/forms/HeroInput";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ChevronDown, Lock, Loader2, Repeat, UserPlus, Users, Wallet } from "lucide-react";
import { PropertyChips, type PropertyChipItem } from "@/components/forms/PropertyChips";
import { handleEnter } from "@/lib/forms/enter-next";
import { friendlyDay } from "@/lib/format-date";
import { haptic } from "@/lib/haptics";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/budget/categories";
import { computeShares, dropZeroShares } from "@/lib/budget/splits";
import { guessCategory } from "@/lib/budget/guess-category";
import type { RecentTitle } from "@/lib/budget/recent-titles";
import { parseRate, toTripAmount } from "@/lib/budget/currency";
import { CURRENCIES } from "@/lib/currencies";
import { currencySymbol } from "@/lib/format-currency";
import { cn, firstName } from "@/lib/utils";
import { ParticipantPicker } from "@/components/shared/ParticipantPicker";
import { DateField } from "@/components/shared/DateTimeFields";
import type {
  Expense,
  ExpenseCategory,
  Participant,
  ParticipantSplit,
  Payer,
  RecurrenceFrequency,
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

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: Participant[];
  currency: string;
  /** Participant ID pre-selected as payer in create mode (typically the current user). */
  defaultPayerId?: string | null;
  /** Propose « Répéter » (budgets de groupe). */
  allowRecurrence?: boolean;
  /** Derniers intitulés : un toucher les réutilise (avec leur catégorie). */
  recentTitles?: RecentTitle[];
  /** `initialValues` sert de modèle pour une NOUVELLE dépense (date du jour), pas pour une modification. */
  duplicate?: boolean;
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
    recurrence?: RecurrenceFrequency;
  }) => Promise<void>;
}

const RATE_FORMAT = (r: number) => Number(r.toPrecision(6)).toString().replace(".", ",");

const RECURRENCE_OPTIONS: { value: "none" | RecurrenceFrequency; label: string }[] = [
  { value: "none", label: "Une fois" },
  { value: "weekly", label: "Chaque semaine" },
  { value: "monthly", label: "Chaque mois" },
];

export function ExpenseForm({
  open,
  onOpenChange,
  participants,
  currency,
  defaultPayerId,
  allowRecurrence = false,
  recentTitles = [],
  duplicate = false,
  initialValues,
  onSubmit,
}: ExpenseFormProps) {
  const isEdit = !!initialValues && !duplicate;
  const categoryTouched = useRef(false);

  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [splits, setSplits] = useState<SplitState[]>([]);
  const [newMemberIds, setNewMemberIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const amountRef = useRef<HTMLInputElement>(null);
  const [spendCurrency, setSpendCurrency] = useState(currency);
  const [rateStr, setRateStr] = useState("");
  const [rateLoading, setRateLoading] = useState(false);
  const rateTouched = useRef(false);
  const [recurrence, setRecurrence] = useState<"none" | RecurrenceFrequency>("none");

  // ── Hydration ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setIssue(null);

    if (initialValues) {
      setTitle(initialValues.title);
      setAmountStr(initialValues.amount.toString().replace(".", ","));
      setSpendCurrency(initialValues.currency);
      setRateStr(initialValues.currency === currency ? "" : RATE_FORMAT(initialValues.exchangeRate));
      rateTouched.current = true;
      setRecurrence("none");
      setCategory(initialValues.category);
      setDate(duplicate ? new Date().toISOString().split("T")[0] : initialValues.date);
      categoryTouched.current = true;
      setSplitMode(initialValues.splitMode);
      setPayers(initialValues.payers.map((p) => ({ ...p })));

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
      setSpendCurrency(currency);
      setRateStr("");
      rateTouched.current = false;
      setRecurrence("none");
      setCategory("other");
      categoryTouched.current = false;
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
  }, [open, initialValues, duplicate, participants, defaultPayerId, currency]);

  // ── Taux de change (BCE) : proposé automatiquement, toujours modifiable ─────
  useEffect(() => {
    if (!open || spendCurrency === currency || rateTouched.current) return;
    const ctrl = new AbortController();
    setRateLoading(true);
    fetch(`/api/rates?from=${spendCurrency}&to=${currency}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { rate?: number } | null) => {
        if (d?.rate && !rateTouched.current) setRateStr(RATE_FORMAT(d.rate));
      })
      .catch(() => null)
      .finally(() => {
        if (!ctrl.signal.aborted) setRateLoading(false);
      });
    return () => ctrl.abort();
  }, [open, spendCurrency, currency]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const rawAmount = useMemo(() => {
    const cleaned = amountStr.replace(",", ".").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amountStr]);

  const foreign = spendCurrency !== currency;
  const rate = foreign ? parseRate(rateStr) : 1;
  /** Montant dans la devise du voyage : c'est lui que répartissent « Payé par » et « Pour qui ». */
  const amount = rate > 0 ? toTripAmount(rawAmount, rate) : 0;

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
    amount > 0 && rate > 0 && payerValid && splitValid;

  // ── Amount effect (fixed mode) ─────────────────────────────────────────────
  useEffect(() => {
    if (splitMode !== "fixed" || !amount) return;
    setSplits((prev) => {
      const active = prev.filter((s) => !s.excluded);
      const allZero = active.every((s) => (s.fixedAmount ?? 0) < 0.005);
      if (!allZero) return prev;
      return rebalanceFixed(prev, amount);
    });
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
    if (!formValid) {
      const message =
        rawAmount <= 0
          ? "Entre un montant."
          : rate <= 0
            ? "Saisis le taux de change."
            : !payerValid
              ? "Le total payé doit être égal au montant."
              : "La répartition doit être complète.";
      setIssue(message);
      setShake((n) => n + 1);
      haptic("warning");
      if (rawAmount <= 0) amountRef.current?.focus();
      return;
    }
    setIssue(null);
    setSubmitting(true);
    try {
      const finalPayers =
        payers.length === 1
          ? [{ participantId: payers[0].participantId, amount: rawAmount }]
          : payers.map((p) => ({ ...p, amount: p.amount / rate }));
      const cleanSplits: ParticipantSplit[] = dropZeroShares(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        splits.map(({ pinned: _p, ...s }) => s),
        splitMode
      );
      await onSubmit({
        title: title.trim() || (category === "other" ? "Dépense" : CATEGORIES[category].label),
        amount: rawAmount,
        currency: spendCurrency,
        exchangeRate: rate,
        category,
        payers: finalPayers,
        date,
        splitMode,
        splits: cleanSplits,
        ...(allowRecurrence && !isEdit && recurrence !== "none" && { recurrence }),
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const sym = currencySymbol(currency);
  const spendSym = currencySymbol(spendCurrency);

  // ── Puces de réglages : chacune affiche sa valeur et ouvre son choix en dessous ──
  const todayLabel = friendlyDay(date);
  const payerName = (id: string) => {
    const p = participants.find((x) => x.id === id);
    return p ? firstName(p.name) : "?";
  };
  const defaultPayer = (defaultPayerId && participants.find((p) => p.id === defaultPayerId)) || participants[0];
  const payerLabel =
    payers.length === 0
      ? "Payé par"
      : payers.length === 1
        ? defaultPayerId && payers[0].participantId === defaultPayerId
          ? "Payé par toi"
          : `Payé par ${payerName(payers[0].participantId)}`
        : `Payé par ${payers.length} personnes`;
  const payerFilled = !(payers.length === 1 && payers[0].participantId === defaultPayer?.id);
  const everyone = splitMode === "equal" && activeCount === participants.length;
  const splitLabel =
    splitMode === "percentage"
      ? "En pourcentages"
      : splitMode === "fixed"
        ? "En montants"
        : everyone
          ? "Tout le monde"
          : activeCount === 1
            ? `Pour ${payerName(splits.find((x) => !x.excluded)?.participantId ?? "")}`
            : `Pour ${activeCount} sur ${participants.length}`;

  const payerPanel = (
            <div className="space-y-4">
    <ParticipantPicker
      participants={participants}
      selected={payers.map((py) => py.participantId)}
      onToggle={togglePayer}
    />

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
              className="flex items-center gap-3 rounded-2xl bg-card px-3 py-2"
            >
              <ParticipantAvatar participant={p} size="xs" className="ring-card" />
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
              <span className="text-xs text-muted-foreground w-8">{sym}</span>
            </div>
          );
        })}
        <p
          className={cn(
            "text-center text-sm font-medium",
            Math.abs(payerTotal - amount) < 0.01
              ? "text-positive"
              : "text-muted-foreground"
          )}
        >
          {Math.abs(payerTotal - amount) < 0.01
            ? "Répartition correcte ✓"
            : `Total : ${formatCurrency(payerTotal, currency)} / ${formatCurrency(amount, currency)}`}
        </p>
      </div>
    )}
  </div>
  );

  const splitPanel = (
            <div className="space-y-3">
    {!everyone && (
      <div className="flex justify-end">
        <button type="button" onClick={handleEqualForAll} className="pressable h-9 rounded-full bg-primary/10 px-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/15">
          Tous, équitable
        </button>
      </div>
    )}

    {newMemberIds.size > 0 && (
      <div className="flex items-start gap-2.5 rounded-[1.25rem] bg-secondary px-3.5 py-3 text-sm text-muted-foreground">
        <UserPlus size={16} className="mt-0.5 shrink-0" />
        <span>
          {newMemberIds.size === 1
            ? "Un nouveau membre a rejoint le groupe. Coche-le si cette dépense le concerne."
            : `${newMemberIds.size} nouveaux membres ont rejoint le groupe. Coche-les si cette dépense les concerne.`}
        </span>
      </div>
    )}

    <Tabs value={splitMode} onValueChange={handleSplitModeChange}>
      <TabsList className="grid w-full grid-cols-3 bg-card">
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
                  ? "bg-secondary ring-1 ring-foreground/20 ring-inset"
                  : "bg-card/60 opacity-55"
                : "bg-card"
            )}
          >
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

            <ParticipantAvatar participant={p} size="sm" />
            <span className="truncate text-[0.95rem] font-medium">{p.name}</span>
            {isNew && (
              <span className="shrink-0 rounded-full bg-foreground/[0.08] px-2 py-0.5 text-xs font-semibold text-foreground">
                Nouveau
              </span>
            )}
            <span className="flex-1" />

            {splitMode === "equal" && (
              <span className="tabular text-[0.95rem] font-semibold">
                {split.excluded ? "-" : formatCurrency(share, currency)}
              </span>
            )}

            {splitMode === "percentage" && split.excluded && (
              <span className="tabular text-[0.95rem] font-semibold">-</span>
            )}

            {splitMode === "percentage" && !split.excluded && (
              <div className="flex items-center gap-1.5">
                {split.pinned && !split.excluded && (
                  <button
                    type="button"
                    onClick={() => unpinPct(p.id)}
                    title="Désancrer"
                    className="text-primary opacity-70 hover:opacity-100 transition-opacity shrink-0"
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
                <span className="text-xs text-muted-foreground">%</span>
                <span className="text-xs text-muted-foreground w-16 text-right tabular-nums">
                  {formatCurrency(share, currency)}
                </span>
              </div>
            )}

            {splitMode === "fixed" && split.excluded && (
              <span className="tabular text-[0.95rem] font-semibold">-</span>
            )}

            {splitMode === "fixed" && !split.excluded && (
              <div className="flex items-center gap-1.5">
                {split.pinned && !split.excluded && (
                  <button
                    type="button"
                    onClick={() => unpinFixed(p.id)}
                    title="Désancrer"
                    className="text-primary opacity-70 hover:opacity-100 transition-opacity shrink-0"
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
                <span className="text-xs text-muted-foreground w-6">{sym}</span>
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
  );

  const chips: PropertyChipItem[] = [
    {
      id: "date",
      icon: Calendar,
      label: todayLabel || "Date",
      filled: todayLabel !== "Aujourd'hui",
      panel: <DateField id="expense-date" value={date} onChange={setDate} />,
    },
    ...(participants.length > 1
      ? ([
          { id: "payer", icon: Wallet, label: payerLabel, filled: payerFilled, issue: !payerValid && amount > 0, panel: payerPanel },
          { id: "split", icon: Users, label: splitLabel, filled: !everyone, issue: !splitValid && amount > 0, panel: splitPanel },
        ] satisfies PropertyChipItem[])
      : []),
    ...(allowRecurrence && !isEdit
      ? ([
          {
            id: "recurrence",
            icon: Repeat,
            label: RECURRENCE_OPTIONS.find((o) => o.value === recurrence)?.label ?? "Une fois",
            filled: recurrence !== "none",
            panel: (
              <div className="flex gap-2">
                {RECURRENCE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={recurrence === o.value}
                    onClick={() => setRecurrence(o.value)}
                    className={cn(
                      "pressable h-11 flex-1 rounded-full px-3 text-sm font-semibold transition-colors",
                      recurrence === o.value ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-foreground/[0.06]"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ),
          },
        ] satisfies PropertyChipItem[])
      : []),
  ];

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
          <SheetTitle>{isEdit ? "Modifier la dépense" : duplicate ? "Dupliquer la dépense" : "Nouvelle dépense"}</SheetTitle>
        </div>

        {/* Corps : une seule page, les réglages en puces */}
        <div data-enter-chain className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <div className="py-3 text-center">
                <label htmlFor="expense-amount" className="sr-only">Montant</label>
                <input
                  ref={amountRef}
                  id="expense-amount"
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => {
                    setAmountStr(e.target.value.replace(/[^0-9.,]/g, ""));
                    setIssue(null);
                  }}
                  placeholder={`0,00 ${spendSym}`}
                  className="tabular mt-1 w-full bg-transparent text-center font-display text-[3.75rem] leading-none font-extrabold tracking-[-0.04em] text-foreground placeholder:text-foreground/20 focus:outline-none"
                  autoFocus={!isEdit}
                  onFocus={(e) => e.target.select()}
                  enterKeyHint="next"
                  onKeyDown={(e) => handleEnter(e)}
                />
              </div>

              <div className="-mt-3 space-y-3">
                <div className="flex justify-center">
                  <label className="relative inline-flex h-9 items-center gap-1 rounded-full bg-foreground/[0.06] pr-2.5 pl-3.5 text-sm font-semibold">
                    <span className="sr-only">Devise de la dépense</span>
                    {spendCurrency}
                    <ChevronDown size={14} aria-hidden="true" />
                    <select
                      value={spendCurrency}
                      onChange={(e) => {
                        rateTouched.current = false;
                        setRateStr("");
                        setSpendCurrency(e.target.value);
                      }}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    >
                      {[currency, ...CURRENCIES.filter((c) => c !== currency)].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {foreign && (
                  <div className="rounded-[1.25rem] bg-secondary px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="tabular shrink-0 font-medium">1 {spendCurrency} =</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={`Taux de change ${spendCurrency} vers ${currency}`}
                        value={rateStr}
                        onChange={(e) => {
                          rateTouched.current = true;
                          setRateStr(e.target.value.replace(/[^0-9.,]/g, ""));
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder={rateLoading ? "…" : "Taux"}
                        className="tabular h-10 min-w-0 flex-1 rounded-xl border border-input bg-card px-3 text-right text-base outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/12"
                      />
                      <span className="shrink-0 font-medium">{currency}</span>
                    </div>
                    <p className="tabular mt-2 text-sm text-muted-foreground">
                      {rate > 0 && rawAmount > 0
                        ? `${formatCurrency(rawAmount, spendCurrency)} = ${formatCurrency(amount, currency)}`
                        : rateLoading
                          ? "Taux du jour en cours de chargement…"
                          : "Saisis le taux pour convertir."}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <HeroInput
                  id="expense-title"
                  value={title}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTitle(value);
                    if (!categoryTouched.current) {
                      const guess = guessCategory(value);
                      if (guess) setCategory(guess);
                    }
                  }}
                  placeholder="Pour quoi ?"
                  className="text-center text-[1.25rem]"
                  aria-label="Pour quoi"
                  enterKeyHint="done"
                  onKeyDown={(e) => handleEnter(e, () => void handleSubmit())}
                />
                {!isEdit && title.trim() === "" && recentTitles.length > 0 && (
                  <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pt-1" role="group" aria-label="Intitulés récents">
                    {recentTitles.map((r) => (
                      <button
                        key={r.title}
                        type="button"
                        onClick={() => {
                          setTitle(r.title);
                          setCategory(r.category);
                          categoryTouched.current = true;
                        }}
                        className="pressable h-9 shrink-0 rounded-full bg-foreground/[0.06] px-3.5 text-sm font-semibold transition-colors hover:bg-foreground/[0.1]"
                      >
                        {r.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                  {CATEGORY_ORDER.map((cat) => {
                    const cfg = CATEGORIES[cat];
                    const Icon = cfg.icon;
                    const selected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          categoryTouched.current = true;
                          setCategory(cat);
                        }}
                        aria-pressed={selected}
                        className={cn(
                          "pressable flex h-11 shrink-0 items-center gap-2 rounded-full pr-4 pl-3 transition-colors",
                          selected
                            ? "bg-foreground text-background"
                            : "bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.08]"
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


          <PropertyChips items={chips} />
        </div>

        {/* Pied de page : une seule action, sous le pouce ; le message dit ce qui manque */}
        <div className="shrink-0 border-t border-border bg-popover px-5 pt-3 pb-4">
          {issue && (
            <p key={shake} role="alert" className="animate-shake mb-3 rounded-2xl bg-red-500/10 px-4 py-2.5 text-[0.95rem] font-medium text-red-400">
              {issue}
            </p>
          )}
          <Button size="lg" onClick={handleSubmit} disabled={submitting} className="w-full shadow-section">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : isEdit ? "Enregistrer" : "Ajouter la dépense"}
          </Button>
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
      <p className="text-center text-sm font-medium text-muted-foreground">
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
          ok ? "text-positive" : "text-muted-foreground"
        )}
      >
        {ok ? (
          <>Total : 100% ✓</>
        ) : (
          <>
            Total : {Math.round(splitTotal * 10) / 10}%
            <span className="text-muted-foreground">
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
        ok ? "text-positive" : "text-muted-foreground"
      )}
    >
      {ok ? (
        <>Total : {formatCurrency(splitTotal, currency)} ✓</>
      ) : (
        <>
          Total : {formatCurrency(splitTotal, currency)}
          <span className="text-muted-foreground">
            ({diff > 0 ? "+" : ""}
            {formatCurrency(diff, currency)})
          </span>
        </>
      )}
    </div>
  );
}
