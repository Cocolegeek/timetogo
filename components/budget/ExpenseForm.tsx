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
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
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
      setSplits(initialValues.splits);
    } else {
      setTitle("");
      setAmountStr("");
      setCategory("other");
      setDate(new Date().toISOString().split("T")[0]);
      setPaidById(participants[0]?.id ?? "");
      setSplitMode("equal");
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

  const setFixedAmount = (participantId: string, value: number) => {
    setSplits((prev) =>
      prev.map((s) =>
        s.participantId === participantId
          ? { ...s, fixedAmount: Math.max(0, value) }
          : s
      )
    );
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
      const equalAmt =
        active.length > 0 ? Math.round((amount / active.length) * 100) / 100 : 0;
      setSplits((prev) =>
        prev.map((s) => (s.excluded ? s : { ...s, fixedAmount: equalAmt }))
      );
    }
  };

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
                      "flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-all active:scale-95",
                      selected
                        ? "border-indigo-400 bg-indigo-500/15 text-indigo-200"
                        : "border-white/10 bg-white/4 text-slate-400 hover:bg-white/8"
                    )}
                  >
                    <ParticipantAvatar participant={p} size="xs" />
                    <span className="text-sm font-medium">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split mode */}
          <div className="space-y-3">
            <Label className="text-slate-300 text-sm font-medium">Pour qui ?</Label>
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

                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl border transition-all",
                      split.excluded
                        ? "border-white/4 bg-white/2 opacity-50"
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

                    <ParticipantAvatar participant={p} size="xs" />
                    <span className="text-sm text-slate-200 flex-1 truncate">
                      {p.name}
                    </span>

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
