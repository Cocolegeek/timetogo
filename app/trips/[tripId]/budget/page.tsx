"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { m as motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
const ExpenseForm = dynamic(() => import("@/components/budget/ExpenseForm").then(m => ({ default: m.ExpenseForm })), { ssr: false });
const RecurringSheet = dynamic(() => import("@/components/budget/RecurringSheet"), { ssr: false });
import { ActivityList } from "@/components/budget/ActivityList";
import { ExpenseList } from "@/components/budget/ExpenseList";
import { Spinner } from "@/components/shared/Spinner";
import { BalancesView } from "@/components/budget/BalancesView";
import { ExpenseDetailSheet } from "@/components/budget/ExpenseDetailSheet";
import { useTrip } from "@/hooks/useTrip";
import { useBudget } from "@/hooks/useBudget";
import { useDebts } from "@/hooks/useDebts";
import { useActivity } from "@/hooks/useActivity";
import { useRecurring } from "@/hooks/useRecurring";
import { Download, Repeat, Share2 } from "lucide-react";
import { buildExpensesCsv } from "@/lib/export/expenses-csv";
import { buildRecap } from "@/lib/export/recap";
import { recentTitles } from "@/lib/budget/recent-titles";
import { downloadFile, safeFilename, shareText } from "@/lib/export/download";
import { FREQUENCY_LABELS } from "@/lib/budget/recurrence";
import { tripFeatures } from "@/lib/trip-features";
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
import type { Expense, Payer, RecurrenceFrequency, Settlement } from "@/types";

type BudgetTab = "expenses" | "balances" | "history";
const TAB_ORDER: BudgetTab[] = ["expenses", "balances", "history"];

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
  const [duplicating, setDuplicating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(searchParams.get("expense"));
  const [activeTab, setActiveTab] = useState<BudgetTab>(
    searchParams.get("tab") === "balances" ? "balances" : "expenses"
  );
  const [filter, setFilter] = useState<string>("all");

  const features = trip ? tripFeatures(trip) : null;
  const hasRecurring = features?.hasRecurring ?? false;
  const { items: recurring, create: createRecurring, remove: removeRecurring, applyDue } = useRecurring(tripId, hasRecurring);
  const { entries: activity } = useActivity(tripId, activeTab === "history");
  const [recurringOpen, setRecurringOpen] = useState(false);
  const { remove: removeRecurringUndoable, pending: pendingRecurring } = useUndoableDelete(removeRecurring);
  const visibleRecurring = useMemo(() => recurring.filter((r) => !pendingRecurring.has(r.id)), [recurring, pendingRecurring]);

  useEffect(() => {
    if (hasRecurring) void applyDue();
  }, [hasRecurring, applyDue]);

  const { pending, remove } = useUndoableDelete(deleteExpense);
  const recents = useMemo(() => recentTitles(allExpenses), [allExpenses]);
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
    recurrence?: RecurrenceFrequency;
  }) => {
    const { recurrence, ...expenseData } = data;
    if (editingExpense && !duplicating) {
      await updateExpense(editingExpense.id, expenseData);
      setEditingExpense(undefined);
      toast({ message: "Dépense modifiée", tone: "success" });
    } else {
      await addExpense({ ...expenseData, tripId });
      setEditingExpense(undefined);
      setDuplicating(false);
      if (recurrence) {
        try {
          await createRecurring({ ...expenseData, frequency: recurrence, firstDate: expenseData.date });
          toast({ message: `Dépense ajoutée · ${FREQUENCY_LABELS[recurrence].toLowerCase()}`, tone: "success" });
        } catch {
          toast({ message: "Dépense ajoutée, mais la répétition n'a pas pu être créée (réseau ?)", tone: "error", duration: 5000 });
        }
      } else {
        toast({
          message: "Dépense ajoutée",
          tone: "success",
          action: { label: "Ajouter une autre", onClick: () => openNewExpense() },
        });
      }
      setActiveTab("expenses");
    }
  };

  const openNewExpense = () => {
    setEditingExpense(undefined);
    setDuplicating(false);
    setFormOpen(true);
  };

  const handleTap = (expense: Expense) => setDetailId(expense.id);

  const handleEditFromDetail = () => {
    if (!detailExpense) return;
    setEditingExpense(detailExpense);
    setDuplicating(false);
    setDetailId(null);
    setFormOpen(true);
  };

  const handleDuplicateFromDetail = () => {
    if (!detailExpense) return;
    setEditingExpense(detailExpense);
    setDuplicating(true);
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
    openNewExpense();
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

  const handleExportCsv = () => {
    downloadFile(
      `${safeFilename(trip?.name ?? "voyou")}-depenses.csv`,
      "text/csv",
      buildExpensesCsv(expenses, participants, currency, (c) => CATEGORIES[c]?.label ?? c)
    );
    toast({ message: "Fichier CSV prêt", tone: "success" });
  };

  const handleShareRecap = async () => {
    const text = buildRecap({
      tripName: trip?.name ?? "Voyou",
      currency,
      expenses,
      participants,
      balances,
      settlements,
      format: formatCurrency,
    });
    const result = await shareText(text, `${trip?.name ?? "Voyou"} · comptes`);
    if (result === "copied") toast({ message: "Récap copié", tone: "success" });
    if (result === "failed") toast({ message: "Impossible de partager le récap", tone: "error" });
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
      <section className="rounded-[1.75rem] bg-primary p-5 text-primary-foreground shadow-section">
        <p className="text-sm font-medium text-primary-foreground/70">Total dépensé</p>
        <NumberTicker
          value={totalSpent}
          format={formatMoney}
          className="tabular mt-1 block font-display text-[2.75rem] leading-none font-extrabold tracking-[-0.035em]"
        />
        <dl className={cn("mt-5 grid gap-3 border-t border-primary-foreground/15 pt-4", myBalance ? "grid-cols-3" : "grid-cols-2")}>
          {myBalance ? (
            <>
              <div>
                <dt className="text-xs font-medium text-primary-foreground/65">Ta part</dt>
                <dd className="tabular mt-0.5 text-[1.05rem] font-semibold">{formatMoney(myBalance.owes)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-primary-foreground/65">Tu as payé</dt>
                <dd className="tabular mt-0.5 text-[1.05rem] font-semibold">{formatMoney(myBalance.paid)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-primary-foreground/65">Ton solde</dt>
                <dd className="tabular mt-0.5 text-[1.05rem] font-semibold">
                  {Math.abs(myBalance.net) < 0.01 ? "À jour" : `${myBalance.net > 0 ? "+" : "−"}${formatMoney(Math.abs(myBalance.net))}`}
                </dd>
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
            { value: "history", label: "Historique" },
          ]}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: TAB_ORDER.indexOf(activeTab) > 0 ? 24 : -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: TAB_ORDER.indexOf(activeTab) > 0 ? -24 : 24 }}
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
                        filter === f.id ? "bg-foreground text-background" : "bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.08]"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
              {visibleRecurring.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRecurringOpen(true)}
                  className="pressable mb-4 flex min-h-12 w-full items-center gap-3 rounded-[1.25rem] bg-secondary px-4 text-left transition-colors hover:bg-foreground/[0.08]"
                >
                  <Repeat size={18} aria-hidden="true" />
                  <span className="flex-1 text-[0.95rem] font-semibold">
                    {visibleRecurring.length === 1 ? "1 dépense répétée" : `${visibleRecurring.length} dépenses répétées`}
                  </span>
                  <span className="text-sm text-muted-foreground">Gérer</span>
                </button>
              )}
              <ExpenseList
              expenses={filteredExpenses}
              participants={participants}
              currency={currency}
              onDelete={handleDelete}
              onEdit={handleTap}
            />
            </>
          ) : activeTab === "history" ? (
            <ActivityList entries={activity} currency={currency} />
          ) : (
            <>
              <BalancesView
                myId={myId}
                balances={balances}
                settlements={settlements}
                participants={participants}
                currency={currency}
                onSettle={handleSettle}
              />
              {expenses.length > 0 && (
                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    onClick={handleShareRecap}
                    className="pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-foreground/[0.06] text-[0.95rem] font-semibold transition-colors hover:bg-foreground/[0.08]"
                  >
                    <Share2 size={17} aria-hidden="true" />
                    Partager le récap
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-foreground/[0.06] text-[0.95rem] font-semibold transition-colors hover:bg-foreground/[0.08]"
                  >
                    <Download size={17} aria-hidden="true" />
                    Exporter en CSV
                  </button>
                </div>
              )}
            </>
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
        onDuplicate={handleDuplicateFromDetail}
      />

      <ExpenseForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingExpense(undefined);
            setDuplicating(false);
          }
        }}
        participants={participants}
        currency={currency}
        defaultPayerId={myId}
        allowRecurrence={hasRecurring}
        recentTitles={recents}
        duplicate={duplicating}
        onSubmit={handleSubmit}
        initialValues={editingExpense}
      />

      {hasRecurring && (
        <RecurringSheet
          open={recurringOpen}
          onOpenChange={setRecurringOpen}
          items={visibleRecurring}
          currency={currency}
          onRemove={removeRecurringUndoable}
        />
      )}

    </div>
  );
}
