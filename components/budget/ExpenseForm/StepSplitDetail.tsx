"use client";

import { useFormContext } from "react-hook-form";
import { SlidersHorizontal, UserX, UserCheck, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExpenseFormValues } from "@/lib/budget/schemas";
import type { Participant, ParticipantSplit } from "@/types";

interface StepSplitDetailProps {
  participants: Participant[];
  currency: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Redistribute a removed % proportionally to the remaining active splits */
function redistributePercentage(
  splits: ParticipantSplit[],
  excludedId: string
): ParticipantSplit[] {
  const removedPct =
    splits.find((s) => s.participantId === excludedId)?.percentage ?? 0;
  const remaining = splits.filter(
    (s) => !s.excluded && s.participantId !== excludedId
  );

  if (remaining.length === 0) return splits; // can't exclude everyone

  const totalOther = remaining.reduce((acc, s) => acc + (s.percentage ?? 0), 0);

  const updated = splits.map((s) => {
    if (s.participantId === excludedId) return { ...s, excluded: true, percentage: 0 };
    if (s.excluded) return s;
    // Proportional redistribution; if all others are at 0, distribute equally
    const proportion =
      totalOther > 0
        ? (s.percentage ?? 0) / totalOther
        : 1 / remaining.length;
    return {
      ...s,
      percentage: Math.round((s.percentage ?? 0) + removedPct * proportion),
    };
  });

  // Fix rounding drift → last active absorbs the difference
  return fixPercentageTotal(updated);
}

/** When re-including: equalize all active participants */
function reincludeParticipant(
  splits: ParticipantSplit[],
  reincludedId: string
): ParticipantSplit[] {
  const updated = splits.map((s) =>
    s.participantId === reincludedId ? { ...s, excluded: false } : s
  );
  return equalizePercentages(updated);
}

/** Equalize percentages among all active (non-excluded) participants */
function equalizePercentages(splits: ParticipantSplit[]): ParticipantSplit[] {
  const active = splits.filter((s) => !s.excluded);
  if (active.length === 0) return splits;
  const base = Math.floor(100 / active.length);
  const remainder = 100 - base * active.length;
  let activeIdx = 0;
  return splits.map((s) => {
    if (s.excluded) return { ...s, percentage: 0 };
    const extra = activeIdx === 0 ? remainder : 0; // first active absorbs remainder
    activeIdx++;
    return { ...s, percentage: base + extra };
  });
}

/** Ensure active percentages sum exactly to 100 (fixes rounding) */
function fixPercentageTotal(splits: ParticipantSplit[]): ParticipantSplit[] {
  const active = splits.filter((s) => !s.excluded);
  const total = active.reduce((acc, s) => acc + (s.percentage ?? 0), 0);
  const diff = 100 - total;
  if (diff === 0 || active.length === 0) return splits;

  // Add the diff to the last active participant
  const lastActiveId = active[active.length - 1].participantId;
  return splits.map((s) =>
    s.participantId === lastActiveId
      ? { ...s, percentage: (s.percentage ?? 0) + diff }
      : s
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function StepSplitDetail({ participants, currency }: StepSplitDetailProps) {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ExpenseFormValues>();

  const splits = watch("splits");
  const splitMode = watch("splitMode");
  const totalAmount = watch("amount") || 0;

  const currencySymbol = currency === "EUR" ? "€" : currency;

  const activeSplits = splits.filter((s) => !s.excluded);
  const pctTotal = activeSplits.reduce((acc, s) => acc + (s.percentage ?? 0), 0);
  const fixedTotal = activeSplits.reduce((acc, s) => acc + (s.fixedAmount ?? 0), 0);

  const pctExact = Math.abs(pctTotal - 100) < 0.01;

  // ── Toggle exclusion ───────────────────────────────────────────────────────

  const toggleExclusion = (participantId: string) => {
    const split = splits.find((s) => s.participantId === participantId);
    if (!split) return;

    let updated: ParticipantSplit[];

    if (split.excluded) {
      // Re-include
      if (splitMode === "percentage") {
        updated = reincludeParticipant(splits, participantId);
      } else {
        updated = splits.map((s) =>
          s.participantId === participantId ? { ...s, excluded: false } : s
        );
        if (splitMode === "equal") updated = recalcEqual(updated, totalAmount);
      }
    } else {
      // Exclude — must keep at least 1 active
      if (activeSplits.length <= 1) return;

      if (splitMode === "percentage") {
        updated = redistributePercentage(splits, participantId);
      } else {
        updated = splits.map((s) =>
          s.participantId === participantId
            ? { ...s, excluded: true, share: 0, fixedAmount: 0 }
            : s
        );
        if (splitMode === "equal") updated = recalcEqual(updated, totalAmount);
      }
    }

    setValue("splits", updated, { shouldValidate: true });
  };

  const recalcEqual = (s: ParticipantSplit[], amount: number) => {
    const active = s.filter((x) => !x.excluded);
    const share = active.length > 0 ? amount / active.length : 0;
    return s.map((x) => ({ ...x, share: x.excluded ? 0 : share }));
  };

  // ── Update single percentage ───────────────────────────────────────────────

  const updatePct = (index: number, value: number) => {
    const updated = [...splits];
    updated[index] = { ...updated[index], percentage: value };
    setValue("splits", updated, { shouldValidate: true });
  };

  // ── Update single fixed amount ─────────────────────────────────────────────

  const updateFixed = (index: number, value: number | "") => {
    const updated = [...splits];
    updated[index] = {
      ...updated[index],
      fixedAmount: value === "" ? 0 : value,
    };
    setValue("splits", updated, { shouldValidate: true });
  };

  // ── Equalize percentages ───────────────────────────────────────────────────

  const equalize = () => {
    setValue("splits", equalizePercentages(splits), { shouldValidate: true });
  };

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">Répartition par participant</p>

        <div className="flex items-center gap-2">
          {/* Percentage total badge */}
          {splitMode === "percentage" && (
            <span
              className={cn(
                "text-xs font-semibold px-2.5 py-1 rounded-full transition-all",
                pctExact
                  ? "text-emerald-300 bg-emerald-500/15 ring-1 ring-emerald-500/30"
                  : "text-red-300 bg-red-500/15 ring-1 ring-red-500/30"
              )}
            >
              {pctTotal}% / 100%
            </span>
          )}

          {/* Fixed total badge */}
          {splitMode === "fixed" && (
            <span
              className={cn(
                "text-xs font-semibold px-2.5 py-1 rounded-full transition-all",
                Math.abs(fixedTotal - totalAmount) < 0.01
                  ? "text-emerald-300 bg-emerald-500/15 ring-1 ring-emerald-500/30"
                  : "text-amber-300 bg-amber-500/15 ring-1 ring-amber-500/30"
              )}
            >
              {fixedTotal.toFixed(2)} / {totalAmount.toFixed(2)} {currencySymbol}
            </span>
          )}

          {/* Equalize button (percentage mode) */}
          {splitMode === "percentage" && activeSplits.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={equalize}
              className="h-7 w-7 text-slate-500 hover:text-indigo-300"
              title="Égaliser les pourcentages"
            >
              <RotateCcw size={13} />
            </Button>
          )}

          {/* Split icon */}
          <SlidersHorizontal size={14} className="text-slate-500" />
        </div>
      </div>

      {/* Participant rows */}
      <div className="space-y-2">
        <AnimatePresence>
          {splits.map((split, index) => {
            const participant = participants.find(
              (p) => p.id === split.participantId
            );
            if (!participant) return null;

            const equalShare =
              activeSplits.length > 0 ? totalAmount / activeSplits.length : 0;

            return (
              <motion.div
                key={split.participantId}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                    split.excluded
                      ? "border-white/4 bg-white/2 opacity-50"
                      : "border-white/10 bg-white/5"
                  )}
                >
                  {/* Avatar */}
                  <ParticipantAvatar
                    participant={participant}
                    size="sm"
                    className={cn(
                      "transition-all",
                      split.excluded && "grayscale opacity-40"
                    )}
                  />

                  {/* Name */}
                  <span
                    className={cn(
                      "text-sm flex-1 truncate transition-colors",
                      split.excluded ? "text-slate-600" : "text-slate-300"
                    )}
                  >
                    {participant.name}
                  </span>

                  {/* Value input (when not excluded) */}
                  {!split.excluded && (
                    <>
                      {splitMode === "equal" && (
                        <span className="text-sm font-semibold text-indigo-300 shrink-0">
                          {equalShare.toFixed(2)} {currencySymbol}
                        </span>
                      )}

                      {splitMode === "percentage" && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={split.percentage ?? 0}
                            onChange={(e) =>
                              updatePct(index, parseFloat(e.target.value) || 0)
                            }
                            className={cn(
                              "w-16 text-right px-2 py-1.5 rounded-lg text-sm font-semibold",
                              "bg-white/8 border border-white/10 focus:outline-none focus:ring-1",
                              pctExact
                                ? "text-indigo-300 focus:ring-indigo-500/50"
                                : "text-red-300 focus:ring-red-500/50",
                              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            )}
                          />
                          <span className="text-slate-400 text-sm font-medium">%</span>
                          {/* Sub-amount */}
                          <span className="text-xs text-slate-600 w-16 text-right">
                            ={" "}
                            {(
                              (totalAmount * (split.percentage ?? 0)) /
                              100
                            ).toFixed(2)}
                            {currencySymbol}
                          </span>
                        </div>
                      )}

                      {splitMode === "fixed" && (
                        <div className="w-28 shrink-0">
                          <CurrencyInput
                            value={split.fixedAmount ?? 0}
                            onChange={(v) => updateFixed(index, v)}
                            currency={currencySymbol}
                            className="py-1.5 text-xs text-right"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Exclude / Re-include toggle */}
                  <button
                    type="button"
                    onClick={() => toggleExclusion(split.participantId)}
                    title={split.excluded ? "Réintégrer" : "Exclure de la dépense"}
                    className={cn(
                      "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                      split.excluded
                        ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : activeSplits.length <= 1
                        ? "bg-white/4 text-slate-700 cursor-not-allowed"
                        : "bg-red-500/8 text-slate-600 hover:bg-red-500/15 hover:text-red-400"
                    )}
                    disabled={!split.excluded && activeSplits.length <= 1}
                  >
                    {split.excluded ? (
                      <UserCheck size={13} />
                    ) : (
                      <UserX size={13} />
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Percentage validation error */}
      {errors.splits && (
        <p className="text-xs text-red-400">
          {typeof errors.splits.message === "string"
            ? errors.splits.message
            : "Erreur de répartition"}
        </p>
      )}

      {/* Contextual hint */}
      {splitMode === "percentage" && !pctExact && (
        <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
          <span>⚠</span>
          Ajuste les pourcentages pour atteindre exactement 100%,
          ou utilise{" "}
          <button
            type="button"
            onClick={equalize}
            className="underline underline-offset-2 hover:text-amber-300 transition-colors"
          >
            Égaliser
          </button>
          .
        </p>
      )}

      {/* Excluded count */}
      {splits.some((s) => s.excluded) && (
        <p className="text-xs text-slate-600">
          {splits.filter((s) => s.excluded).length} participant
          {splits.filter((s) => s.excluded).length !== 1 ? "s" : ""} exclu
          {splits.filter((s) => s.excluded).length !== 1 ? "s" : ""} de
          cette dépense
        </p>
      )}
    </div>
  );
}
