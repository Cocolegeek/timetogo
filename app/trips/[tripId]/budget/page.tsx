"use client";

import { use, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
const ExpenseForm = dynamic(() => import("@/components/budget/ExpenseForm").then(m => ({ default: m.ExpenseForm })), { ssr: false });
import { ExpenseList } from "@/components/budget/ExpenseList";
import { Spinner } from "@/components/shared/Spinner";
import { BalancesView } from "@/components/budget/BalancesView";
import { ExpenseDetailSheet } from "@/components/budget/ExpenseDetailSheet";
import { useTrip } from "@/hooks/useTrip";
import { useBudget } from "@/hooks/useBudget";
import { useDebts } from "@/hooks/useDebts";
import { formatCurrency } from "@/lib/format-currency";
import { EASE_OUT } from "@/lib/motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { NumberTicker } from "@/components/motion/NumberTicker";
import { useToast } from "@/components/shared/Toaster";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";
import { useQuickAdd } from "@/hooks/useQuickAdd";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/budget/categories";
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
    expenses: allExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
  } = useBudget(tripId);

  const toast = useToast();
  const searchParams = useSearchParams();
  const [formOpen, setFormOpen] = useState(searchParams.get("new") === "expense");
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [detailId, setDetailId] = useState<string | null>(searchParams.get("expense"));
  const [activeTab, setActiveTab] = useState<BudgetTab>(
    searchParams.get("tab") === "balances" ? "balances" : "expenses"
  );
  const [filter, setFilter] = useState<string>("all");

  const { pending, remove } = useUndoableDelete(deleteExpense);
  const expenses = useMemo(() => allExpenses.filter((e) => !pending.has(e.id)), [allExpenses, pending]);
  const detailExpense = detailId ? expenses.find((e) => e.id === detailId) ?? null : null;

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
      toast({ message: "Dépense modifiée", tone: "success" });
    } else {
      await addExpense({ ...data, tripId });
      toast({ message: "Dépense ajoutée", tone: "success" });
      setActiveTab("expenses");
    }
  };

  const handleTap = (expense: Expense) => setDetailId(expense.id);

  const handleEditFromDetail = () => {
    if (!detailExpense) return;
    setEditingExpense(detailExpense);
    setDetailId(null);
    setFormOpen(true);
  };

  const handleDeleteFromDetail = () => {
    if (!detailExpense) return;
    remove(detailExpense.id, "Dépense supprimée");
    setDetailId(null);
  };

  const handleDelete = (id: string) => remove(id, "Dépense supprimée");

  useQuickAdd((kind) => {
    if (kind !== "expense") return;
    setEditingExpense(undefined);
    setFormOpen(true);
  });

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
    toast({ message: "Remboursement enregistré", tone: "success" });
  };

  const categoriesPresent = CATEGORY_ORDER.filter((c) => expenses.some((e) => e.category === c));
  const filteredExpenses = expenses.filter((e) => {
    if (filter === "all") return true;
    if (filter === "mine") {
      return (
        !!myId &&
        (e.payers.some((p) => p.participantId === myId) || e.splits.some((sp) => sp.participantId === myId && !sp.excluded))
      );
    }
    return e.category === filter;
  });

  const myBalance = myId ? balances.find((b) => b.participantId === myId) : undefined;
  const totalSpent = expenses
    .filter((e) => e.category !== "reimbursement")
    .reduce((sum, e) => sum + e.amountInTripCurrency, 0);
  const formatMoney = (n: number) => formatCurrency(n, currency);
  const pendingCount = myId ? settlements.filter((s) => s.fromId === myId || s.toId === myId).length : settlements.length;

  if (!trip) {
    return <Spinner />;
  }

  return (
    <div className="space-y-5 pt-1">
      <PageHeader eyebrow={trip.name} title="Budget" />

      {/* ── Summary ── */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-primary p-5 text-primary-foreground shadow-section">
        <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -top-16 -right-16 size-56 opacity-[0.14]">
          <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="100" cy="100" r="64" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="100" cy="100" r="32" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <p className="text-sm font-medium text-primary-foreground/70">Total dépensé</p>
        <NumberTicker
          value={totalSpent}
          format={formatMoney}
          className="tabular mt-1 block font-display text-[2.75rem] leading-none font-extrabold tracking-[-0.035em]"
        />
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-primary-foreground/15 pt-4">
          {myBalance ? (
            <>
              <div>
                <dt className="text-xs font-medium text-primary-foreground/65">Ta part</dt>
                <dd className="tabular mt-0.5 text-lg font-semibold">{formatMoney(myBalance.owes)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-primary-foreground/65">Tu as payé</dt>
                <dd className="tabular mt-0.5 text-lg font-semibold">{formatMoney(myBalance.paid)}</dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt className="text-xs font-medium text-primary-foreground/65">Par personne</dt>
                <dd className="tabular mt-0.5 text-lg font-semibold">
                  {formatMoney(participants.length ? totalSpent / participants.length : 0)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-primary-foreground/65">Dépenses</dt>
                <dd className="tabular mt-0.5 text-lg font-semibold">{expenses.length}</dd>
              </div>
            </>
          )}
        </dl>
      </section>

      {/* ── Tabs ── */}
      <div
        className="sticky z-20 -mx-4 bg-background/85 px-4 py-2 backdrop-blur-xl backdrop-saturate-150"
        style={{ top: "calc(env(safe-area-inset-top) + 3.5rem)" }}
      >
        <SegmentedControl
          id="budget"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "expenses", label: "Dépenses" },
            { value: "balances", label: "Soldes", badge: pendingCount },
          ]}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: activeTab === "balances" ? 24 : -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: activeTab === "balances" ? -24 : 24 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
        >
          {activeTab === "expenses" ? (
            <>
              {expenses.length > 0 && (
                <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
                  {[
                    { id: "all", label: "Tout" },
                    ...(myId ? [{ id: "mine", label: "Me concernent" }] : []),
                    ...categoriesPresent.map((c) => ({ id: c, label: CATEGORIES[c].label })),
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={filter === f.id}
                      onClick={() => setFilter(f.id)}
                      className={cn(
                        "pressable h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
                        filter === f.id ? "bg-foreground text-background" : "bg-foreground/[0.06] text-foreground hover:bg-foreground/10"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
              <ExpenseList
              expenses={filteredExpenses}
              participants={participants}
              currency={currency}
              onDelete={handleDelete}
              onEdit={handleTap}
            />
            </>
          ) : (
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
      </AnimatePresence>

      <ExpenseDetailSheet
        expense={detailExpense}
        participants={participants}
        currency={currency}
        open={detailExpense !== null}
        onOpenChange={(open) => { if (!open) setDetailId(null); }}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
      />

      <ExpenseForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingExpense(undefined);
        }}
        participants={participants}
        currency={currency}
        defaultPayerId={myId}
        onSubmit={handleSubmit}
        initialValues={editingExpense}
      />

    </div>
  );
}
