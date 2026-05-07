"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type BudgetMode = "total" | "per-person";

interface BudgetEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  /** Currently saved total budget (always stored as TOTAL in the DB). */
  initialValue?: number;
  /** Number of participants in the trip — used for the per-person mode. */
  participantCount: number;
  /** Pass `null` to clear the budget. */
  onSave: (value: number | null) => Promise<void>;
}

const formatCurrency = (n: number, currency: string) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);

export function BudgetEditDialog({
  open,
  onOpenChange,
  currency,
  initialValue,
  participantCount,
  onSave,
}: BudgetEditDialogProps) {
  const [mode, setMode] = useState<BudgetMode>("total");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMode("total");
      setValue(
        initialValue !== undefined && initialValue !== null
          ? String(initialValue).replace(".", ",")
          : ""
      );
    }
  }, [open, initialValue]);

  /** The numeric value typed in the input, regardless of mode. */
  const numericValue = useMemo(() => {
    const n = Number(value.replace(",", ".").trim());
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [value]);

  /** Final TOTAL budget that will be saved (always converted from the chosen mode). */
  const computedTotal = useMemo(() => {
    if (numericValue <= 0) return 0;
    return mode === "per-person"
      ? Math.round(numericValue * participantCount * 100) / 100
      : numericValue;
  }, [mode, numericValue, participantCount]);

  const perPersonPreview = useMemo(() => {
    if (mode !== "total" || numericValue <= 0 || participantCount === 0) return null;
    return numericValue / participantCount;
  }, [mode, numericValue, participantCount]);

  const handleSave = async (clear = false) => {
    setSaving(true);
    try {
      if (clear) {
        await onSave(null);
      } else {
        await onSave(computedTotal > 0 ? computedTotal : null);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const switchMode = (next: BudgetMode) => {
    if (next === mode) return;
    // Convert the displayed value when switching modes
    if (numericValue > 0 && participantCount > 0) {
      if (next === "per-person" && mode === "total") {
        const perPerson = Math.round((numericValue / participantCount) * 100) / 100;
        setValue(String(perPerson).replace(".", ","));
      } else if (next === "total" && mode === "per-person") {
        const total = Math.round(numericValue * participantCount * 100) / 100;
        setValue(String(total).replace(".", ","));
      }
    }
    setMode(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-foreground/10 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-slate-100 text-lg flex items-center gap-2">
            <Wallet size={18} className="text-indigo-400" />
            Budget prévisionnel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-foreground/4 border border-foreground/8 rounded-lg">
            <button
              type="button"
              onClick={() => switchMode("total")}
              className={cn(
                "py-2 rounded-md text-sm font-medium transition-all",
                mode === "total"
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Total
            </button>
            <button
              type="button"
              onClick={() => switchMode("per-person")}
              className={cn(
                "py-2 rounded-md text-sm font-medium transition-all",
                mode === "per-person"
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:text-slate-200"
              )}
              disabled={participantCount === 0}
            >
              Par personne
            </button>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm font-medium">
              {mode === "per-person" ? "Montant par personne" : "Montant total"}
            </Label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) =>
                  setValue(e.target.value.replace(/[^0-9.,]/g, ""))
                }
                placeholder={mode === "per-person" ? "ex: 400" : "ex: 1500"}
                className="bg-foreground/8 border-foreground/10 text-slate-100 placeholder:text-slate-500 pr-14 tabular-nums"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
                {currency}
              </span>
            </div>

            {/* Live preview */}
            {mode === "per-person" && numericValue > 0 && (
              <p className="text-xs text-slate-500">
                × {participantCount} voyageur{participantCount !== 1 ? "s" : ""} ={" "}
                <span className="text-slate-200 font-medium">
                  {formatCurrency(computedTotal, currency)}
                </span>{" "}
                au total
              </p>
            )}
            {mode === "total" && perPersonPreview !== null && (
              <p className="text-xs text-slate-500">
                Soit{" "}
                <span className="text-slate-200 font-medium">
                  {formatCurrency(perPersonPreview, currency)}
                </span>{" "}
                par personne ({participantCount} voyageur
                {participantCount !== 1 ? "s" : ""})
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-3">
          {initialValue !== undefined && initialValue !== null && (
            <Button
              variant="ghost"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              Supprimer
            </Button>
          )}
          <Button
            onClick={() => handleSave(false)}
            disabled={saving || numericValue <= 0}
            className="flex-1 gradient-primary text-white border-0 disabled:opacity-40"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
