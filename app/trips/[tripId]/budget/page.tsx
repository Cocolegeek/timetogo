"use client";

import { use, useState } from "react";
import { Plus, Wallet, Receipt, Scale, ArrowRightLeft, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
const ExpenseForm = dynamic(() => import("@/components/budget/ExpenseForm").then(m => ({ default: m.ExpenseForm })), { ssr: false });
import { ExpenseList } from "@/components/budget/ExpenseList";
import { Spinner } from "@/components/shared/Spinner";
import { SectionLabel } from "@/components/shared/SectionLabel";
import { BackHomeBar } from "@/components/shared/BackHomeBar";
import { BalanceSummary } from "@/components/budget/BalanceSummary";
import { DebtSettlements } from "@/components/budget/DebtSettlements";
import { MyBalanceCard } from "@/components/budget/MyBalanceCard";
import { useTrip } from "@/hooks/useTrip";
import { useBudget } from "@/hooks/useBudget";
import { useDebts } from "@/hooks/useDebts";
import { cn } from "@/lib/utils";
import type { Expense, Payer, Settlement } from "@/types";

type BudgetTab = "expenses" | "balances" | "settlements";

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
  const [activeTab, setActiveTab] = useState<BudgetTab>("expenses");

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
      <BackHomeBar />

      {/* Total spent — hero teinte accent translucide sur glass */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative overflow-hidden rounded-3xl p-6 glass-strong border border-section shadow-section">
          {/* Translucent accent tint */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.55 var(--accent-c) var(--accent-h) / 55%), oklch(0.48 calc(var(--accent-c) + 0.03) calc(var(--accent-h) + 25) / 55%))",
            }}
          />
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

      {/* Tabs — pastille animée façon TabSwitcher home */}
      <BudgetTabSwitcher active={activeTab} onChange={setActiveTab} />

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mt-4"
      >
        {activeTab === "expenses" && (
          <ExpenseList
            expenses={expenses}
            participants={participants}
            currency={currency}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        )}

        {activeTab === "balances" && (
          <div className="space-y-5">
            {myParticipant && myBalance && (
              <MyBalanceCard
                balance={myBalance}
                participant={myParticipant}
                currency={currency}
              />
            )}

            <div>
              <SectionLabel count={balances.length}>
                {myParticipant ? "Tous les soldes" : "Soldes"}
              </SectionLabel>
              <BalanceSummary
                balances={balances}
                participants={participants}
                currency={currency}
              />
            </div>
          </div>
        )}

        {activeTab === "settlements" && (
          <div className="space-y-5">
            {/* Me concerne — boxé en glass-subtle avec bordure section pour
                signaler la priorité, seul wrap restant côté Régler */}
            {myParticipant && (
              <div className="glass-subtle border border-section rounded-2xl p-4">
                <SectionLabel count={mySettlements.length}>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: myParticipant.color }}
                      aria-hidden
                    />
                    Me concerne
                  </span>
                </SectionLabel>
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
              </div>
            )}

            {/* Tous les règlements (ou seulement les autres si identité connue) */}
            {(otherSettlements.length > 0 || !myParticipant) && (
              <div>
                <SectionLabel count={myParticipant ? otherSettlements.length : settlements.length}>
                  {myParticipant ? "Entre les autres" : "Remboursements simplifiés"}
                </SectionLabel>
                <DebtSettlements
                  settlements={myParticipant ? otherSettlements : settlements}
                  participants={participants}
                  currency={currency}
                  onSettle={handleSettle}
                />
              </div>
            )}
          </div>
        )}
      </motion.div>

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
        style={{ bottom: "var(--fab-bottom)" }}
        aria-label="Nouvelle dépense"
        title="Nouvelle dépense"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ─── BudgetTabSwitcher ──────────────────────────────────────────────────────

const TABS: { id: BudgetTab; label: string; icon: typeof Receipt }[] = [
  { id: "expenses",    label: "Dépenses", icon: Receipt        },
  { id: "balances",    label: "Soldes",   icon: Scale          },
  { id: "settlements", label: "Régler",   icon: ArrowRightLeft },
];

function BudgetTabSwitcher({
  active,
  onChange,
}: {
  active: BudgetTab;
  onChange: (tab: BudgetTab) => void;
}) {
  return (
    <div className="relative flex items-center gap-1 p-1 rounded-2xl bg-foreground/5 border border-foreground/8">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]",
              isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {isActive && (
              <motion.span
                layoutId="budget-tab-pill"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent-500), oklch(0.50 calc(var(--accent-c) + 0.03) calc(var(--accent-h) + 25)))",
                  boxShadow: "0 6px 18px -6px var(--accent-glow)",
                }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon size={15} strokeWidth={isActive ? 2.4 : 2} />
              <span>{tab.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

