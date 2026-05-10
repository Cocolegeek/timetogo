import { z } from "zod";

const EXPENSE_CATEGORIES = [
  "courses",
  "restaurant",
  "activities",
  "transport",
  "accommodation",
  "other",
] as const;

const SPLIT_MODES = ["equal", "percentage", "fixed"] as const;

export const participantSplitSchema = z.object({
  participantId: z.string(),
  excluded: z.boolean(),
  percentage: z.number().min(0).max(100).optional(),
  fixedAmount: z.number().min(0).optional(),
  share: z.number().optional(),
});

export const payerSchema = z.object({
  participantId: z.string(),
  amount: z.number().min(0),
});

export const expenseSchema = z
  .object({
    title: z.string().min(1, "Le titre est requis"),
    amount: z
      .number({ message: "Montant invalide" })
      .positive("Le montant doit être positif"),
    category: z.enum(EXPENSE_CATEGORIES),
    payers: z.array(payerSchema).min(1, "Sélectionne au moins un payeur"),
    date: z.string().min(1, "La date est requise"),
    splitMode: z.enum(SPLIT_MODES),
    splits: z.array(participantSplitSchema),
  })
  .superRefine((data, ctx) => {
    const active = data.splits.filter((s) => !s.excluded);
    if (active.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sélectionne au moins un bénéficiaire",
        path: ["splits"],
      });
      return;
    }
    if (data.splitMode === "percentage") {
      const total = active.reduce((acc, s) => acc + (s.percentage ?? 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Les pourcentages doivent totaliser 100% (actuel : ${Math.round(total)}%)`,
          path: ["splits"],
        });
      }
    }
    if (data.splitMode === "fixed") {
      const total = active.reduce((acc, s) => acc + (s.fixedAmount ?? 0), 0);
      if (Math.abs(total - data.amount) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `La somme des montants doit égaler le total (${data.amount.toFixed(2)})`,
          path: ["splits"],
        });
      }
    }
  });

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const tripSchema = z.object({
  name: z.string().min(1, "Le nom du voyage est requis"),
  destination: z.string().min(1, "La destination est requise"),
  emoji: z.string().min(1),
  currency: z.string().min(1),
  startDate: z.string().min(1, "La date de départ est requise"),
  endDate: z.string().min(1, "La date de retour est requise"),
  participants: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Nom requis"),
        color: z.string(),
      })
    )
    .min(1, "Au moins un participant est requis"),
  totalBudget: z.number().positive().optional(),
});

export type TripFormValues = z.infer<typeof tripSchema>;
