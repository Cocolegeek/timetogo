"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { CATEGORY_CONFIG } from "@/components/budget/CategoryPill";
import { cn } from "@/lib/utils";
import type { ExpenseFormValues } from "@/lib/budget/schemas";
import type { ExpenseCategory } from "@/types";

const CATEGORIES = Object.entries(CATEGORY_CONFIG) as [
  ExpenseCategory,
  (typeof CATEGORY_CONFIG)[ExpenseCategory]
][];

export function StepBasicInfo({ currency }: { currency: string }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ExpenseFormValues>();

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-slate-300 text-xs">Titre de la dépense</Label>
        <Input
          {...register("title")}
          placeholder="Ex: Dîner au restaurant"
          className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/50"
        />
        {errors.title && (
          <p className="text-xs text-red-400">{errors.title.message}</p>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <Label className="text-slate-300 text-xs">Montant</Label>
        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <CurrencyInput
              value={field.value as number | ""}
              onChange={(v) => field.onChange(v === "" ? undefined : v)}
              currency={currency === "EUR" ? "€" : currency}
              placeholder="0.00"
            />
          )}
        />
        {errors.amount && (
          <p className="text-xs text-red-400">{errors.amount.message}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-slate-300 text-xs">Catégorie</Label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(([key, { label, Icon, color, bg }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => field.onChange(key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all duration-200 text-xs font-medium",
                    field.value === key
                      ? cn("border-indigo-500/50 bg-indigo-500/10", color)
                      : "border-white/8 bg-white/4 text-slate-400 hover:border-white/15 hover:bg-white/8"
                  )}
                >
                  <Icon size={18} />
                  <span className="leading-tight text-center">{label}</span>
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <Label className="text-slate-300 text-xs">Date</Label>
        <Input
          {...register("date")}
          type="date"
          className="bg-white/8 border-white/10 text-slate-100 focus-visible:ring-indigo-500/50 [color-scheme:dark]"
        />
        {errors.date && (
          <p className="text-xs text-red-400">{errors.date.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-slate-300 text-xs">Notes (optionnel)</Label>
        <Textarea
          {...register("notes")}
          placeholder="Détails, numéro de reçu…"
          rows={2}
          className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/50 resize-none"
        />
      </div>
    </div>
  );
}
