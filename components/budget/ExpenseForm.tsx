"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/budget/categories";
import { computeShares } from "@/lib/budget/splits";
import { cn } from "@/lib/utils";
import type {
  Expense,
  ExpenseCategory,
  Participant,
  ParticipantSplit,
  SplitMode,
} from "@/types";

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: Participant[];
  currency: string;
  /** If provided, the form is in edit mode */
  initialValues?: Expense;
  onSubmit: (data: {
    title: string;
    amount: number;
    currency: string;
    exchangeRate: number;
    category: ExpenseCategory;
    paidById: string;
    date: string;
    splitMode: SplitMode;
    splits: ParticipantSplit[];
  }) => Promise<void>;
}

const formatCurrency = (n: number, currency: string) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

/**
 * Distribute `total` into `count` parts so that the sum of cents
 * equals `total` exactly (no rounding errors). Extra cents are
 * spread on the first participants.
 */
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
  const [paidById, setPaidById] = useState<string>("");
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [splits, setSplits] = useState<ParticipantSplit[]>([]);
  /**
   * IDs of participants who joined the trip AFTER this expense was created.
   * They are surfaced with a "NOUVEAU" badge and start unchecked so the user
   * can manually decide whether they should benefit from the expense.
   */
  const [newMemberIds, setNewMemberIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Hydrate when opened or when participants change
  useEffect(() => {
    if (!open) return;

    if (initialValues) {
      setTitle(initialValues.title);
      setAmountStr(initialValues.amount.toString().replace(".", ","));
      setCategory(initialValues.category);
      setDate(initialValues.date);
      setPaidById(initialValues.paidById);
      setSplitMode(initialValues.splitMode);

      // ── Reconciliation with the current trip member list ──
      // 1. Keep splits for participants still in the trip (drops "ghosts").
      // 2. Add any trip member missing from the saved splits as `excluded`,
      //    so the user can manually opt them in if relevant.
      const existingByParticipant = new Map(
        initialValues.splits
          .filter((s) => participants.some((p) => p.id === s.participantId))
          .map((s) => [s.participantId, s])
      );
      const merged: ParticipantSplit[] = participants.map((p) => {
        const existing = existingByParticipant.get(p.id);
        if (existing) return existing;
        return {
          participantId: p.id,
          excluded: true,
          percentage: 0,
          fixedAmount: 0,
          share: 0,
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
      setPaidById(participants[0]?.id ?? "");
      setSplitMode("equal");
      setNewMemberIds(new Set());
      setSplits(
        participants.map((p) => ({
          participantId: p.id,
          excluded: false,
          percentage:
            participants.length > 0 ? 100 / participants.length : 0,
          fixedAmount: 0,
          share: 0,
        }))
      );
    }
  }, [open, initialValues, participants]);

  const amount = useMemo(() => {
    const cleaned = amountStr.replace(",", ".").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amountStr]);

  // Live computed shares for display
  const computedSplits = useMemo(
    () => computeShares(amount, splits, splitMode),
    [amount, splits, splitMode]
  );

  // Validation
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

  const formValid =
    title.trim().length > 0 &&
    amount > 0 &&
    paidById.length > 0 &&
    splitValid;

  // Toggle inclusion
  const toggleInclusion = (participantId: string) => {
    setSplits((prev) =>
      prev.map((s) =>
        s.participantId === participantId ? { ...s, excluded: !s.excluded } : s
      )
    );
  };

  const setPercentage = (participantId: string, value: number) => {
    setSplits((prev) =>
      prev.map((s) =>
        s.participantId === participantId
          ? { ...s, percentage: Math.max(0, Math.min(100, value)) }
          : s
      )
    );
  };

  /**
   * In "fixed" mode: when user edits one participant's amount,
   * auto-rebalance the OTHER active participants so the total
   * matches `amount` (Tricount-style behaviour).
   */
  const setFixedAmount = (participantId: string, value: number) => {
    const newValue = Math.max(0, value);
    setSplits((prev) => {
      const active = prev.filter((s) => !s.excluded);
      const others = active.filter((s) => s.participantId !== participantId);
      const remaining = Math.max(0, amount - newValue);
      const distributed = distributeCents(remaining, others.length);

      // Build a quick lookup for "others"
      let i = 0;
      const otherAmounts = new Map<string, number>();
      for (const s of others) {
        otherAmounts.set(s.participantId, distributed[i] ?? 0);
        i++;
      }

      return prev.map((s) => {
        if (s.excluded) return s;
        if (s.participantId === participantId) {
          return { ...s, fixedAmount: newValue };
        }
        return {
          ...s,
          fixedAmount: otherAmounts.get(s.participantId) ?? s.fixedAmount ?? 0,
        };
      });
    });
  };

  // Auto-redistribute equally when switching to percentage/fixed for the first time
  const handleSplitModeChange = (mode: string) => {
    const newMode = mode as SplitMode;
    setSplitMode(newMode);
    if (newMode === "percentage") {
      const active = splits.filter((s) => !s.excluded);
      const equalPct = active.length > 0 ? 100 / active.length : 0;
      setSplits((prev) =>
        prev.map((s) =>
          s.excluded ? s : { ...s, percentage: equalPct }
        )
      );
    } else if (newMode === "fixed") {
      const active = splits.filter((s) => !s.excluded);
      const distributed = distributeCents(amount, active.length);
      let i = 0;
      setSplits((prev) =>
        prev.map((s) => {
          if (s.excluded) return s;
          const next = distributed[i] ?? 0;
          i++;
          return { ...s, fixedAmount: next };
        })
      );
    }
  };

  // When the total amount changes in fixed mode, rebalance to keep totals consistent
  useEffect(() => {
    if (splitMode !== "fixed") return;
    if (!amount) return;
    setSplits((prev) => {
      const active = prev.filter((s) => !s.excluded);
      if (active.length === 0) return prev;
      const distributed = distributeCents(amount, active.length);
      let i = 0;
      return prev.map((s) => {
        if (s.excluded) return s;
        const next = distributed[i] ?? 0;
        i++;
        return { ...s, fixedAmount: next };
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, splitMode]);

  const handleSubmit = async () => {
    if (!formValid) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        amount,
        currency,
        exchangeRate: 1,
        category,
        paidById,
        date,
        splitMode,
        splits,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glass-strong border-white/10 max-w-md p-0 max-h-[92vh] overflow-hidden flex flex-col"
        showCloseButton={false}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/8">
          <DialogTitle className="text-slate-100 text-xl">
            {isEdit ? "Modifier la dépense" : "Nouvelle dépense"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Amount — large, focal */}
          <div className="text-center">
            <input
              type="text"
              inputMode="decimal"
              value={amountStr}
              onChange={(e) =>
                setAmountStr(e.target.value.replace(/[^0-9.,]/g, ""))
              }
              placeholder="0,00"
              className="w-full text-center bg-transparent text-6xl font-bold text-slate-100 placeholder:text-slate-700 focus:outline-none tabular-nums"
              autoFocus={!isEdit}
            />
            <p className="text-sm text-slate-500 mt-1">{currency}</p>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm font-medium">Description</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Restaurant, courses, taxi…"
              className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/50"
            />
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm font-medium">Catégorie</Label>
            <div className="grid grid-cols-3 gap-2">
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
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all active:scale-95",
                      selected
                        ? cn(cfg.bg, cfg.color, "border-current ring-1", cfg.ring)
                        : "bg-white/4 border-white/8 text-slate-400 hover:bg-white/8"
                    )}
                  >
                    <Icon size={22} />
                    <span className="text-xs font-medium">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm font-medium">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white/8 border-white/10 text-slate-100 [color-scheme:dark]"
            />
          </div>

          {/* Paid by */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm font-medium">Payé par</Label>
            <div className="flex gap-2 flex-wrap">
              {participants.map((p) => {
                const selected = p.id === paidById;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPaidById(p.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all active:scale-95",
                      selected
                        ? "border-indigo-400 bg-indigo-500/15 text-indigo-200"
                        : "border-white/10 bg-white/4 text-slate-300 hover:bg-white/8"
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
          </div>

          {/* Split mode */}
          <div className="space-y-3">
            <Label className="text-slate-300 text-sm font-medium">Pour qui ?</Label>

            {/* Heads-up banner when new members joined the trip after this expense */}
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
              <TabsList className="grid grid-cols-3 w-full bg-white/4 border border-white/8">
                <TabsTrigger
                  value="equal"
                  className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300"
                >
                  Équitable
                </TabsTrigger>
                <TabsTrigger
                  value="percentage"
                  className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300"
                >
                  %
                </TabsTrigger>
                <TabsTrigger
                  value="fixed"
                  className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300"
                >
                  Montants
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Per-participant rows */}
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
                          : "border-white/4 bg-white/2 opacity-50"
                        : "border-white/8 bg-white/4"
                    )}
                  >
                    {splitMode === "equal" && (
                      <button
                        type="button"
                        onClick={() => toggleInclusion(p.id)}
                        className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                          split.excluded
                            ? "border-slate-600"
                            : "border-indigo-400 bg-indigo-500"
                        )}
                      >
                        {!split.excluded && (
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
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
                    <span className="text-sm text-slate-200 truncate">
                      {p.name}
                    </span>
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
                      <div className="flex items-center gap-2">
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
                          className="w-16 text-right bg-white/8 border border-white/10 rounded-lg px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-indigo-400 tabular-nums"
                        />
                        <span className="text-xs text-slate-500">%</span>
                        <span className="text-xs text-slate-400 w-16 text-right tabular-nums">
                          {formatCurrency(share, currency)}
                        </span>
                      </div>
                    )}

                    {splitMode === "fixed" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={split.fixedAmount ?? 0}
                          onChange={(e) =>
                            setFixedAmount(p.id, Number(e.target.value) || 0)
                          }
                          className="w-20 text-right bg-white/8 border border-white/10 rounded-lg px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-indigo-400 tabular-nums"
                        />
                        <span className="text-xs text-slate-500 w-6">
                          {currency.slice(0, 3)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Live total feedback */}
            <SplitTotalFeedback
              mode={splitMode}
              splitTotal={splitTotal}
              amount={amount}
              activeCount={activeCount}
              currency={currency}
            />
          </div>
        </div>

        {/* Sticky footer */}
        <div
          className="px-5 py-3 border-t border-white/8 bg-slate-900/50"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-slate-400 hover:text-slate-200 hover:bg-white/8"
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
      </DialogContent>
    </Dialog>
  );
}

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
            Total : {Math.round(splitTotal)}%
            <span className="text-slate-500">
              ({diff > 0 ? "+" : ""}
              {Math.round(diff)}%)
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
