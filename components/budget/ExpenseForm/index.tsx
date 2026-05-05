"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StepBasicInfo } from "./StepBasicInfo";
import { StepPaidBy } from "./StepPaidBy";
import { StepSplitMode } from "./StepSplitMode";
import { StepSplitDetail } from "./StepSplitDetail";
import { expenseSchema, type ExpenseFormValues } from "@/lib/budget/schemas";
import { buildDefaultSplits } from "@/lib/budget/splits";
import type { Expense, Participant } from "@/types";

const STEPS = ["Dépense", "Payeur", "Répartition", "Détail"];

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: Participant[];
  currency: string;
  onSubmit: (data: ExpenseFormValues) => Promise<void>;
  initialValues?: Expense;
}

export function ExpenseForm({
  open,
  onOpenChange,
  participants,
  currency,
  onSubmit,
  initialValues,
}: ExpenseFormProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultSplits = buildDefaultSplits(participants.map((p) => p.id));

  const methods = useForm<ExpenseFormValues, unknown, ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as never,
    defaultValues: {
      title: "",
      amount: undefined as unknown as number,
      currency,
      exchangeRate: 1,
      category: "other",
      paidById: participants[0]?.id ?? "",
      date: new Date().toISOString().split("T")[0],
      splitMode: "equal",
      splits: defaultSplits,
      notes: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (initialValues) {
      methods.reset({
        title: initialValues.title,
        amount: initialValues.amount,
        currency: initialValues.currency,
        exchangeRate: initialValues.exchangeRate,
        category: initialValues.category,
        paidById: initialValues.paidById,
        date: initialValues.date,
        splitMode: initialValues.splitMode,
        splits: initialValues.splits,
        notes: initialValues.notes ?? "",
      });
    }
  }, [initialValues, methods]);

  // Reset on open
  useEffect(() => {
    if (open && !initialValues) {
      methods.reset({
        title: "",
        amount: undefined as unknown as number,
        currency,
        exchangeRate: 1,
        category: "other",
        paidById: participants[0]?.id ?? "",
        date: new Date().toISOString().split("T")[0],
        splitMode: "equal",
        splits: buildDefaultSplits(participants.map((p) => p.id)),
        notes: "",
      });
      setStep(0);
    }
  }, [open, initialValues, currency, participants, methods]);

  // Sync splits when participants change
  const splitMode = methods.watch("splitMode");
  useEffect(() => {
    const current = methods.getValues("splits");
    if (current.length !== participants.length) {
      methods.setValue("splits", buildDefaultSplits(participants.map((p) => p.id)));
    }
  }, [participants, methods]);

  // Rebuild shares when mode changes
  useEffect(() => {
    const splits = methods.getValues("splits");
    const amount = methods.getValues("amount") || 0;
    const active = splits.filter((s) => !s.excluded);

    if (splitMode === "percentage") {
      const equalPct = active.length > 0 ? 100 / active.length : 0;
      methods.setValue(
        "splits",
        splits.map((s) => ({
          ...s,
          percentage: s.excluded ? 0 : equalPct,
        }))
      );
    } else if (splitMode === "equal") {
      const share = active.length > 0 ? amount / active.length : 0;
      methods.setValue(
        "splits",
        splits.map((s) => ({ ...s, share: s.excluded ? 0 : share }))
      );
    }
  }, [splitMode, methods]);

  const STEP_FIELDS: (keyof ExpenseFormValues)[][] = [
    ["title", "amount", "category", "date"],
    ["paidById"],
    ["splitMode"],
    ["splits"],
  ];

  const handleNext = async () => {
    const valid = await methods.trigger(STEP_FIELDS[step] as (keyof ExpenseFormValues)[]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = async (data: ExpenseFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastStep = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100 text-lg">
            {initialValues ? "Modifier la dépense" : "Nouvelle dépense"}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="space-y-2">
          <div className="flex justify-between">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={`text-xs font-medium transition-colors ${
                  i === step
                    ? "text-indigo-300"
                    : i < step
                    ? "text-emerald-400"
                    : "text-slate-600"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
          <Progress
            value={progress}
            className="h-1 bg-white/8 [&>div]:bg-indigo-500 [&>div]:transition-all"
          />
        </div>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(handleSubmit as never)}>
            {/* Step content */}
            <div className="min-h-[280px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                >
                  {step === 0 && <StepBasicInfo currency={currency} />}
                  {step === 1 && <StepPaidBy participants={participants} />}
                  {step === 2 && <StepSplitMode />}
                  {step === 3 && (
                    <StepSplitDetail
                      participants={participants}
                      currency={currency}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex justify-between gap-3 mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((s) => Math.max(s - 1, 0))}
                disabled={step === 0}
                className="text-slate-400 hover:text-slate-200"
              >
                <ChevronLeft size={16} />
                Précédent
              </Button>

              {isLastStep ? (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="gradient-primary text-white border-0 px-6"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {initialValues ? "Modifier" : "Ajouter"}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="gradient-primary text-white border-0 px-6"
                >
                  Suivant
                  <ChevronRight size={16} />
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
