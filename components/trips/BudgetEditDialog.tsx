"use client";

import { useState, useEffect } from "react";
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

interface BudgetEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  initialValue?: number;
  /** Pass `null` to clear the budget. */
  onSave: (value: number | null) => Promise<void>;
}

export function BudgetEditDialog({
  open,
  onOpenChange,
  currency,
  initialValue,
  onSave,
}: BudgetEditDialogProps) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(
        initialValue !== undefined && initialValue !== null
          ? String(initialValue).replace(".", ",")
          : ""
      );
    }
  }, [open, initialValue]);

  const handleSave = async (clear = false) => {
    setSaving(true);
    try {
      if (clear) {
        await onSave(null);
      } else {
        const parsed = Number(value.replace(",", ".").trim());
        await onSave(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-slate-100 text-lg flex items-center gap-2">
            <Wallet size={18} className="text-indigo-400" />
            Budget prévisionnel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          <Label className="text-slate-300 text-sm font-medium">
            Montant total
          </Label>
          <div className="relative">
            <Input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) =>
                setValue(e.target.value.replace(/[^0-9.,]/g, ""))
              }
              placeholder="ex: 1500"
              className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500 pr-14 tabular-nums"
              autoFocus
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
              {currency}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Sert à suivre tes dépenses avec une barre de progression. Laisse vide pour le supprimer.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
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
            disabled={saving}
            className="flex-1 gradient-primary text-white border-0"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
