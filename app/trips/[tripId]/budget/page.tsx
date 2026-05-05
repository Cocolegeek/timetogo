"use client";

import { use, useState } from "react";
import { Plus, Wallet, ArrowRightLeft } from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/layout/GlassCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ExpenseForm } from "@/components/budget/ExpenseForm";
import { ExpenseList } from "@/components/budget/ExpenseList";
import { BalanceSummary } from "@/components/budget/BalanceSummary";
import { DebtSettlements } from "@/components/budget/DebtSettlements";
import { useTrip } from "@/hooks/useTrip";
import { useBudget } from "@/hooks/useBudget";
import { useDebts } from "@/hooks/useDebts";
import type { ExpenseFormValues } from "@/lib/budget/schemas";
import type { Expense } from "@/types";

interface BudgetPageProps {
  params: Promise<{ tripId: string }>;
}

export default function BudgetPage({ params }: BudgetPageProps) {
  const { tripId } = use(params);
  const { trip } = useTrip(tripId);
  const { expenses, addExpense, updateExpense, deleteExpense, totalSpent } =
    useBudget(tripId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();

  const participants = trip?.participants ?? [];
  const currency = trip?.currency ?? "EUR";

  const { balances, settlements } = useDebts(expenses, participants);

  const handleSubmit = async (data: ExpenseFormValues) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, data);
      setEditingExpense(undefined);
    } else {
      await addExpense({ ...data, tripId });
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer cette dépense ?")) {
      await deleteExpense(id);
    }
  };

  const handleOpenForm = () => {
    setEditingExpense(undefined);
    setFormOpen(true);
  };

  if (!trip) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/50 border-t-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Budget</h1>
          <p className="text-sm text-slate-400 mt-0.5">{trip.name}</p>
        </div>
        <Button
          onClick={handleOpenForm}
          className="gradient-primary text-white border-0"
        >
          <Plus size={16} />
          Dépense
        </Button>
      </div>

      {/* Total spent */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassCard className="relative overflow-hidden" padding={false}>
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                "radial-gradient(ellipse at top left, oklch(0.55 0.25 264), transparent 60%)",
            }}
          />
          <div className="relative p-5">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={15} className="text-slate-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Total dépensé
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-100">
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency,
                minimumFractionDigits: 2,
              }).format(totalSpent)}
            </p>
            {trip.totalBudget && (
              <p className="text-sm text-slate-500 mt-1">
                sur{" "}
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency,
                  minimumFractionDigits: 0,
                }).format(trip.totalBudget)}{" "}
                budgétisés
              </p>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="expenses">
        <TabsList className="glass w-full border border-white/8 bg-transparent">
          <TabsTrigger
            value="expenses"
            className="flex-1 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300"
          >
            Dépenses ({expenses.length})
          </TabsTrigger>
          <TabsTrigger
            value="balances"
            className="flex-1 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300"
          >
            Soldes
          </TabsTrigger>
          <TabsTrigger
            value="settlements"
            className="flex-1 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300"
          >
            <ArrowRightLeft size={13} className="mr-1" />
            Remboursements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-4">
          <ExpenseList
            expenses={expenses}
            participants={participants}
            currency={currency}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        </TabsContent>

        <TabsContent value="balances" className="mt-4">
          <BalanceSummary
            balances={balances}
            participants={participants}
            currency={currency}
          />
        </TabsContent>

        <TabsContent value="settlements" className="mt-4">
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <ArrowRightLeft size={15} className="text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Remboursements simplifiés
              </h3>
            </div>
            <DebtSettlements
              settlements={settlements}
              participants={participants}
              currency={currency}
            />
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* Expense Form */}
      <ExpenseForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingExpense(undefined);
        }}
        participants={participants}
        currency={currency}
        onSubmit={handleSubmit}
        initialValues={editingExpense}
      />
    </div>
  );
}
