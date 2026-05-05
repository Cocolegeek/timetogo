"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Users, Percent, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpenseFormValues } from "@/lib/budget/schemas";
import type { SplitMode } from "@/types";

const MODES: {
  value: SplitMode;
  label: string;
  desc: string;
  Icon: React.ElementType;
}[] = [
  {
    value: "equal",
    label: "Parts égales",
    desc: "Chaque participant paie la même chose",
    Icon: Users,
  },
  {
    value: "percentage",
    label: "Pourcentages",
    desc: "Définis la part de chacun en %",
    Icon: Percent,
  },
  {
    value: "fixed",
    label: "Montants fixes",
    desc: "Spécifie le montant exact pour chacun",
    Icon: Hash,
  },
];

export function StepSplitMode() {
  const { control } = useFormContext<ExpenseFormValues>();

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">Comment répartir la dépense ?</p>

      <Controller
        name="splitMode"
        control={control}
        render={({ field }) => (
          <div className="space-y-2.5">
            {MODES.map(({ value, label, desc, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => field.onChange(value)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left",
                  field.value === value
                    ? "border-indigo-500/60 bg-indigo-500/10"
                    : "border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/8"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    field.value === value
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "bg-white/5 text-slate-400"
                  )}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <p
                    className={cn(
                      "font-medium text-sm",
                      field.value === value
                        ? "text-indigo-200"
                        : "text-slate-200"
                    )}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      />
    </div>
  );
}
