"use client";

import { use, useState } from "react";
import { Plus, Wallet, ArrowRightLeft, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/layout/GlassCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import dynamic from "next/dynamic";
const ExpenseForm = dynamic(() => import("@/components/budget/ExpenseForm").then(m => ({ default: m.ExpenseForm })), { ssr: false });
import { ExpenseList } from "@/components/budget/ExpenseList";
import { Spinner } from "@/components/shared/Spinner";
import { BalanceSummary } from "@/components/budget/BalanceSummary";
import { DebtSettlements } from "@/components/budget/DebtSettlements";
import { useTrip } from "@/hooks/useTrip";
import { useBudget } from "@/hooks/useBudget";
import { useDebts } from "@/hooks/useDebts";
import type { Expense, Payer, Settlement } from "@/types";

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
    payers: Payer[];
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

  const handleSettle = async (s: Settlement) => {
    const from = participants.find((p) => p.id === s.fromId);
    const to = participants.find((p) => p.id === s.toId);
    await addExpense({
      tripId,
      title: `Remboursement ${from?.name ?? ""} → ${to?.name ?? ""}`,
      amount: s.amount,
      currency,
      exchangeRate: 1,
      category: "reimbursement",
      payers: [{ participantId: s.fromId, amount: s.amount }],
      date: new Date().toISOString().slice(0, 10),
      splitMode: "fixed",
      splits: participants.map((p) => ({
        participantId: p.id,
        excluded: p.id !== s.toId,
        fixedAmount: p.id === s.toId ? s.amount : 0,
      })),
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchTrip(), refetchBudget()]);
    setTimeout(() => setRefreshing(false), 400);
  };

  if (!trip) {
    return (
      <Spinner />
    );
  }

  return (
    <div className="space-y-5">
      {/* Refresh action only — title is redundant with bottom nav */}
      <div className="flex justify-end -mt-1 -mb-2">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-foreground/8 active:bg-foreground/12 transition-all"
          title="Actualiser"
        >
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Total spent — hero pleine couleur, suit l'accent de la section */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div
          className="relative overflow-hidden rounded-3xl p-6 shadow-section-strong"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-500), oklch(0.50 calc(var(--accent-c) + 0.04) calc(var(--accent-h) + 25)))",
          }}
        >
          {/* Glossy highlight */}
          <div
            className="absolute inset-0 pointer-events-none opacity-50"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at top, oklch(1 0 0 / 22%), transparent 70%)",
            }}
          />
          {/* Decorative orb */}
          <div
            className="absolute -bottom-20 -right-20 w-56 h-56 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, oklch(1 0 0 / 18%), transparent 70%)",
              filter: "blur(20px)",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={16} className="text-white/80" />
              <span className="text-xs text-white/80 uppercase tracking-widest font-bold">
                Total dépensé
              </span>
            </div>
            <p className="text-5xl font-bold text-white tabular-nums leading-none">
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency,
                minimumFractionDigits: 2,
              }).format(totalSpent)}
            </p>
            {trip.totalBudget && (
              <p className="text-sm text-white/75 mt-3 font-medium">
                sur{" "}
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency,
                  minimumFractionDigits: 0,
                }).format(trip.totalBudget)}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="expenses">
        <TabsList className="grid grid-cols-3 w-full bg-foreground/4 border border-foreground/8 h-11">
          <TabsTrigger
            value="expenses"
            className="text-sm data-[state=active]:bg-section-soft data-[state=active]:text-section"
          >
            Dépenses
          </TabsTrigger>
          <TabsTrigger
            value="balances"
            className="text-sm data-[state=active]:bg-section-soft data-[state=active]:text-section"
          >
            Soldes
          </TabsTrigger>
          <TabsTrigger
            value="settlements"
            className="text-sm data-[state=active]:bg-section-soft data-[state=active]:text-section"
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
              <h3 className="text-base font-semibold text-slate-200">
                Remboursements simplifiés
              </h3>
            </div>
            <DebtSettlements
              settlements={settlements}
              participants={participants}
              currency={currency}
              onSettle={handleSettle}
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
        className="fixed right-4 z-30 w-14 h-14 rounded-full gradient-primary text-white shadow-section-strong flex items-center justify-center active:scale-95 hover:scale-105 transition-all"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 7rem)",
        }}
        aria-label="Nouvelle dépense"
        title="Nouvelle dépense"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}
