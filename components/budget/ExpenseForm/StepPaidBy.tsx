"use client";

import { Controller, useFormContext } from "react-hook-form";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import { cn } from "@/lib/utils";
import type { ExpenseFormValues } from "@/lib/budget/schemas";
import type { Participant } from "@/types";

interface StepPaidByProps {
  participants: Participant[];
}

export function StepPaidBy({ participants }: StepPaidByProps) {
  const { control, formState: { errors } } = useFormContext<ExpenseFormValues>();

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">Qui a avancé l'argent ?</p>

      <Controller
        name="paidById"
        control={control}
        render={({ field }) => (
          <div className="grid grid-cols-2 gap-3">
            {participants.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => field.onChange(p.id)}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200",
                  field.value === p.id
                    ? "border-indigo-500/60 bg-indigo-500/10"
                    : "border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/8"
                )}
              >
                <ParticipantAvatar participant={p} size="md" />
                <span
                  className={cn(
                    "font-medium text-sm",
                    field.value === p.id ? "text-indigo-200" : "text-slate-300"
                  )}
                >
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        )}
      />

      {errors.paidById && (
        <p className="text-xs text-red-400">{errors.paidById.message}</p>
      )}
    </div>
  );
}
