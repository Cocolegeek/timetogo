"use client";

import { use, useState } from "react";
import { Plus, Wallet, ArrowRightLeft, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/layout/GlassCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ExpenseForm } from "@/components/budget/ExpenseForm";
import { ExpenseList } from "@/components/budget/ExpenseList";
import { BalanceSummary } from "@/components/budget/BalanceSummary";
import { DebtSettlements } from "@/components/budget/DebtSettlements";
import { useTrip } from "@/hooks/useTrip";
import { useBudget } from "@/hooks/useBudget";
import { useDebts } from "@/hooks/useDebts";
import type { Expense } from "@/types";

interface BudgetPageProps {
  params: Promise<{ tripId: string }>;
}

export default function BudgetPage({ params }: BudgetPageProps) {
  const { tripId } = use(params);
  const { trip, refetch: refetchTrip } = useTrip(tripId);
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    totalSpent,
    refetch: refetchBudget,
  } = useBudget(tripId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  const participants = trip?.participants ?? [];
  const currency = trip?.currency ?? "EUR";

  const { balances, settlements } = useDebts(expenses, participants);

  const handleSubmit = async (data: {
    title: string;
    amount: number;
    currency: string;
    exchangeRate: number;
    category: Expense["category"];
    paidById: string;
    date: string;
    splitMode: Expense["splitMode"];
    splits: Expense["splits"];
  }) => {
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
    // Swipe gesture is the confirmation, no extra prompt
    await deleteExpense(id);
  };

  const handleOpenForm = () => {
    setEditingExpense(undefined);
    setFormOpen(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchTrip(), refetchBudget()]);
    setTimeout(() => setRefreshing(false), 400);
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
      {/* Refresh action only — title is redundant with bottom nav */}
      <div className="flex justify-end -mt-1 -mb-2">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/8 active:bg-white/12 transition-all"
          title="Actualiser"
        >
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Total spent */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="relative overflow-hidden" padding={false}>
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                "radial-gradient(ellipse at top left, oklch(0.55 0.25 264), transparent 60%)",
            }}
          />
          <div className="relative p-5">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={15} className="text-slate-300" />
              <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
                Total dépensé
              </span>
            </div>
            <p className="text-4xl font-bold text-slate-100 tabular-nums">
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency,
                minimumFractionDigits: 2,
              }).format(totalSpent)}
            </p>
            {trip.totalBudget && (
              <p className="text-sm text-slate-400 mt-1.5">
                sur{" "}
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency,
                  minimumFractionDigits: 0,
                }).format(trip.totalBudget)}
              </p>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="expenses">
        <TabsList className="grid grid-cols-3 w-full bg-white/4 border border-white/8 h-11">
          <TabsTrigger
            value="expenses"
            className="text-sm data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300"
          >
            Dépenses
          </TabsTrigger>
          <TabsTrigger
            value="balances"
            className="text-sm data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300"
          >
            Soldes
          </TabsTrigger>
          <TabsTrigger
            value="settlements"
            className="text-sm data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300"
          >
            Régler
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

      {/* FAB — Add expense (sits above bottom nav) */}
      <button
        onClick={handleOpenForm}
        className="fixed right-4 z-30 w-14 h-14 rounded-full gradient-primary text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center active:scale-95 hover:scale-105 transition-all"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)",
        }}
        aria-label="Nouvelle dépense"
        title="Nouvelle dépense"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}
