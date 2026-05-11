"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Plus, Wallet, ArrowRightLeft, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/layout/GlassCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import dynamic from "next/dynamic";
const ExpenseForm = dynamic(() => import("@/components/budget/ExpenseForm").then(m => ({ default: m.ExpenseForm })), { ssr: false });
import { ExpenseList } from "@/components/budget/ExpenseList";
import { Spinner } from "@/components/shared/Spinner";
import { BalanceSummary } from "@/components/budget/BalanceSummary";
import { DebtSettlements } from "@/components/budget/DebtSettlements";
import { MyBalanceCard } from "@/components/budget/MyBalanceCard";
import { CheckCircle2 } from "lucide-react";
import { useTrip } from "@/hooks/useTrip";
import { useBudget } from "@/hooks/useBudget";
import { useDebts } from "@/hooks/useDebts";
import type { Expense, Payer, Settlement } from "@/types";

interface BudgetPageProps {
  params: Promise<{ tripId: string }>;
}

export default function BudgetPage({ params }: BudgetPageProps) {
  const { tripId } = use(params);
  const { trip } = useTrip(tripId);
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    totalSpent,
  } = useBudget(tripId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();

  const participants = trip?.participants ?? [];
  const currency = trip?.currency ?? "EUR";

  const { balances, settlements } = useDebts(expenses, participants);

  const myId = trip?.myParticipantId ?? null;
  const myParticipant = myId ? participants.find((p) => p.id === myId) : null;
  const myBalance = myId ? balances.find((b) => b.participantId === myId) : null;
  const mySettlements = myId
    ? settlements.filter((s) => s.fromId === myId || s.toId === myId)
    : [];
  const otherSettlements = myId
    ? settlements.filter((s) => s.fromId !== myId && s.toId !== myId)
    : settlements;

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

  if (!trip) {
    return (
      <Spinner />
    );
  }

  return (
    <div className="space-y-5">
      {/* Back to home */}
      <div className="-mt-1 -mb-2">
        <Link
          href="/trips"
          className="inline-flex items-center justify-center p-2 -ml-2 rounded-xl hover:bg-foreground/8 active:bg-foreground/12 text-slate-400 hover:text-slate-200 transition-all"
          aria-label="Retour à l'accueil"
        >
          <ArrowLeft size={20} />
        </Link>
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

        <TabsContent value="balances" className="mt-4 space-y-5">
          {myParticipant && myBalance && (
            <MyBalanceCard
              balance={myBalance}
              participant={myParticipant}
              currency={currency}
            />
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
              {myParticipant ? "Tous les soldes" : "Soldes"}
            </h3>
            <BalanceSummary
              balances={balances}
              participants={participants}
              currency={currency}
            />
          </div>
        </TabsContent>

        <TabsContent value="settlements" className="mt-4 space-y-5">
          {/* Me concerne — only when identity is set */}
          {myParticipant && (
            <GlassCard className="border-section">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: myParticipant.color }}
                  aria-hidden
                />
                <h3 className="text-base font-semibold text-slate-100">
                  Me concerne
                </h3>
                {mySettlements.length > 0 && (
                  <span className="text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-full bg-section-soft text-section-soft">
                    {mySettlements.length}
                  </span>
                )}
              </div>
              {mySettlements.length === 0 ? (
                <div className="flex items-center gap-2 text-base text-emerald-400 font-semibold py-1">
                  <CheckCircle2 size={18} />
                  <span>Tu es quitte ✓</span>
                </div>
              ) : (
                <DebtSettlements
                  settlements={mySettlements}
                  participants={participants}
                  currency={currency}
                  onSettle={handleSettle}
                />
              )}
            </GlassCard>
          )}

          {/* Tous les règlements (ou seulement les autres si identité connue) */}
          {(otherSettlements.length > 0 || !myParticipant) && (
            <GlassCard>
              <div className="flex items-center gap-2 mb-3">
                <ArrowRightLeft size={15} className="text-section" />
                <h3 className="text-base font-semibold text-slate-200">
                  {myParticipant ? "Entre les autres" : "Remboursements simplifiés"}
                </h3>
                {myParticipant && otherSettlements.length > 0 && (
                  <span className="text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-full bg-foreground/10 text-slate-400">
                    {otherSettlements.length}
                  </span>
                )}
              </div>
              <DebtSettlements
                settlements={myParticipant ? otherSettlements : settlements}
                participants={participants}
                currency={currency}
                onSettle={handleSettle}
              />
            </GlassCard>
          )}
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
