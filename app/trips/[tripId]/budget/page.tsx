"use client";

import { use, useState } from "react";
import { Plus, Receipt, Scale } from "lucide-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
const ExpenseForm = dynamic(() => import("@/components/budget/ExpenseForm").then(m => ({ default: m.ExpenseForm })), { ssr: false });
import { ExpenseList } from "@/components/budget/ExpenseList";
import { Spinner } from "@/components/shared/Spinner";
import { BalancesView } from "@/components/budget/BalancesView";
import { ExpenseDetailSheet } from "@/components/budget/ExpenseDetailSheet";
import { useTrip } from "@/hooks/useTrip";
import { useBudget } from "@/hooks/useBudget";
import { useDebts } from "@/hooks/useDebts";
import { cn } from "@/lib/utils";
import type { Expense, Payer, Settlement } from "@/types";

type BudgetTab = "expenses" | "balances";

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
  } = useBudget(tripId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState<BudgetTab>("expenses");

  const participants = trip?.participants ?? [];
  const currency = trip?.currency ?? "EUR";

  const { balances, settlements } = useDebts(expenses, participants);

  const myId = trip?.myParticipantId ?? null;

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

  // Tap → detail sheet (not directly to edit form)
  const handleTap = (expense: Expense) => {
    setDetailExpense(expense);
  };

  // From detail sheet → edit form
  const handleEditFromDetail = () => {
    if (!detailExpense) return;
    setEditingExpense(detailExpense);
    setDetailExpense(null);
    setFormOpen(true);
  };

  const handleDeleteFromDetail = async () => {
    if (!detailExpense) return;
    await deleteExpense(detailExpense.id);
    setDetailExpense(null);
  };

  const handleDelete = async (id: string) => {
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
    return <Spinner />;
  }

  return (
    <div
      className="flex flex-col"
      style={{
        height: "calc(100dvh - env(safe-area-inset-top) - 1.25rem - var(--bottom-nav-top) - 1.5rem)",
      }}
    >
      {/* ── Tab switcher anchored ── */}
      <div className="shrink-0">
        <BudgetTabSwitcher active={activeTab} onChange={setActiveTab} />
      </div>

      {/* ── Scrollable tab content ── */}
      <div className="flex-1 overflow-y-auto mt-4 pb-4">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "expenses" && (
            <ExpenseList
              expenses={expenses}
              participants={participants}
              currency={currency}
              onDelete={handleDelete}
              onEdit={handleTap}
            />
          )}

          {activeTab === "balances" && (
            <BalancesView
              myId={myId}
              balances={balances}
              settlements={settlements}
              participants={participants}
              currency={currency}
              onSettle={handleSettle}
            />
          )}
        </motion.div>
      </div>

      {/* Expense Detail — tap on card opens this first */}
      <ExpenseDetailSheet
        expense={detailExpense}
        participants={participants}
        currency={currency}
        open={detailExpense !== null}
        onOpenChange={(open) => { if (!open) setDetailExpense(null); }}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
      />

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

      {/* FAB */}
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
  { id: "expenses", label: "Dépenses", icon: Receipt },
  { id: "balances", label: "Soldes",   icon: Scale   },
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
