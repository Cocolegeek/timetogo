"use client";

import { EmojiIcon } from "@/components/shared/EmojiIcon";
import { use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { m as motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  UserRound,
} from "lucide-react";
import dynamic from "next/dynamic";
import { CATEGORIES } from "@/lib/budget/categories";
import { GettingStarted } from "@/components/trips/GettingStarted";
import { DayAgendaCard } from "@/components/trips/DayAgendaCard";
import { MyListCard } from "@/components/trips/MyListCard";
import { useRouter } from "next/navigation";
import { tripStatus } from "@/components/trips/TripCard";
import { ParticipantStack } from "@/components/shared/ParticipantStack";
import { Spinner } from "@/components/shared/Spinner";
import { NumberTicker } from "@/components/motion/NumberTicker";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { useTrip } from "@/hooks/useTrip";
import { useBudget } from "@/hooks/useBudget";
import { useItinerary } from "@/hooks/useItinerary";
import { useMeals } from "@/hooks/useMeals";
import { useDebts } from "@/hooks/useDebts";
import { SLOT_CONFIG } from "@/lib/meals/slots";
import { formatDateRange } from "@/lib/format-date";
import { EASE_OUT } from "@/lib/motion";
import { cn, firstName } from "@/lib/utils";
import { shortDestination } from "@/lib/place";
import { TripCover } from "@/components/trips/TripCover";
import { featuresWithContent, tripFeatures } from "@/lib/trip-features";
import { useTripCounts } from "@/hooks/useTripCounts";
import type { ExpenseCategory, Participant } from "@/types";
import { useMountOnce } from "@/hooks/useMountOnce";

const IdentityDialog = dynamic(() => import("@/components/trips/IdentityDialog"), { ssr: false });
const BudgetEditDialog = dynamic(
  () => import("@/components/trips/BudgetEditDialog").then((m) => ({ default: m.BudgetEditDialog })),
  { ssr: false }
);

/** Solid colour per category for the stacked breakdown bar. */
const CATEGORY_FILL: Record<ExpenseCategory, string> = {
  accommodation: "bg-violet-500",
  transport: "bg-sky-500",
  restaurant: "bg-rose-500",
  courses: "bg-amber-400",
  activities: "bg-emerald-500",
  other: "bg-foreground/30",
  reimbursement: "bg-foreground/20",
};


interface TripDashboardProps {
  params: Promise<{ tripId: string }>;
}

export default function TripDashboardPage({ params }: TripDashboardProps) {
  const { tripId } = use(params);
  const { trip, updateTrip } = useTrip(tripId);
  const { expenses, totalSpent } = useBudget(tripId);
  const { items: itineraryItems } = useItinerary(tripId);
  const { meals } = useMeals(tripId);
  const counts = useTripCounts(tripId);
  const { settlements } = useDebts(expenses, trip?.participants ?? []);
  const router = useRouter();

  const [identityOpen, setIdentityOpen] = useState(false);
  const identityMounted = useMountOnce(identityOpen);
  const [budgetOpen, setBudgetOpen] = useState(false);

  const categoryBreakdown = useMemo(() => {
    const byCategory: Partial<Record<ExpenseCategory, number>> = {};
    for (const e of expenses) {
      if (e.category === "reimbursement") continue;
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amountInTripCurrency;
    }
    return (Object.entries(byCategory) as [ExpenseCategory, number][])
      .filter(([, amount]) => amount > 0)
      .sort(([, a], [, b]) => b - a);
  }, [expenses]);

  const currency = trip?.currency ?? "EUR";
  const formatMoney = useCallback(
    (n: number) =>
      new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n),
    [currency]
  );

  if (!trip) return <Spinner />;

  const me = trip.participants.find((p) => p.id === trip.myParticipantId);
  const otherNames = trip.participants.filter((p) => p.id !== me?.id).map((p) => firstName(p.name));
  const people = [...(me ? ["Toi"] : []), ...otherNames];
  const peopleLabel = people.length > 3 ? `${people.slice(0, 3).join(", ")} +${people.length - 3}` : people.join(", ");
  const iOwe = settlements.filter((s) => s.fromId === trip.myParticipantId);
  const owedToMe = settlements.filter((s) => s.toId === trip.myParticipantId);
  const iOweTotal = iOwe.reduce((sum, s) => sum + s.amount, 0);
  const owedTotal = owedToMe.reduce((sum, s) => sum + s.amount, 0);
  const nameOf = (id: string) => trip.participants.find((p) => p.id === id)?.name ?? "?";

  const budgetPct = trip.totalBudget ? (totalSpent / trip.totalBudget) * 100 : 0;
  const remaining = trip.totalBudget ? trip.totalBudget - totalSpent : 0;
  const barTone = budgetPct >= 100 ? "bg-red-500" : budgetPct >= 85 ? "bg-amber-400" : "bg-primary";

  const today = new Date().toISOString().split("T")[0];
  const todayMeals = meals
    .filter((m) => m.date === today)
    .sort((a, b) => SLOT_CONFIG[a.slot].position - SLOT_CONFIG[b.slot].position);

  const features = tripFeatures(trip);
  const shown = featuresWithContent(trip, counts);
  const status = tripStatus(trip);

  return (
    <Stagger step={0.055} className="space-y-5 pt-1 lg:block lg:columns-2 lg:gap-x-6 lg:space-y-0">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <StaggerItem className="lg:mb-5 lg:break-inside-avoid lg:[column-span:all]">
        <div className="relative overflow-hidden rounded-[1.75rem] shadow-raised">
          {trip.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={trip.iconUrl} alt="" className="h-20 w-full object-cover lg:h-28" draggable={false} />
          ) : (
            <TripCover seed={trip.id} className="h-20 lg:h-28" />
          )}
          {status.kind !== "permanent" && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[0.8125rem] font-semibold text-[#1A1D24] shadow-card backdrop-blur">
              {status.kind === "ongoing" && <span className="size-2 rounded-full bg-emerald-500" />}
              {status.label}
            </span>
          )}
        </div>
        <div className="mt-4 px-1">
          <h1 className="font-display text-[2rem] leading-[1.05] font-extrabold tracking-[-0.03em]">
            {trip.emoji && (
              <span aria-hidden="true" className="mr-2">
                <EmojiIcon emoji={trip.emoji} />
              </span>
            )}
            {trip.name}
          </h1>
          <p className="mt-1.5 text-[0.95rem] text-muted-foreground">
            {[
              trip.startDate ? formatDateRange(trip.startDate, trip.endDate ?? trip.startDate) : "",
              trip.destination ? shortDestination(trip.destination) : "",
            ]
              .filter(Boolean)
              .join(" · ") || `${trip.participants.length} personne${trip.participants.length > 1 ? "s" : ""}`}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIdentityOpen(true)}
              aria-label="Participants du voyage"
              className="pressable flex min-w-0 items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ParticipantStack participants={trip.participants} size="md" max={4} showLabel={false} />
              <span className="truncate text-[0.95rem] font-medium text-muted-foreground">{peopleLabel}</span>
            </button>
            {!me && (
              <button
                type="button"
                onClick={() => setIdentityOpen(true)}
                className="pressable flex h-10 shrink-0 items-center gap-2 rounded-full bg-card pr-3 pl-1 text-sm font-semibold shadow-card"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-secondary">
                  <UserRound size={15} className="text-muted-foreground" />
                </span>
                Qui es-tu ?
                <ChevronDown size={15} className="text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </StaggerItem>

      <StaggerItem className="lg:mb-5 lg:break-inside-avoid lg:[column-span:all]">
        <GettingStarted
          tripId={trip.id}
          steps={[
            {
              id: "me",
              label: "Dis qui tu es",
              hint: "Pour attribuer tes dépenses et tes soldes",
              done: !!me,
              onClick: () => setIdentityOpen(true),
            },
            {
              id: "share",
              label: "Invite la bande",
              hint: "Partage le lien du voyage",
              done: trip.participants.length > 1,
              onClick: () => window.dispatchEvent(new Event("voyou:open-share")),
            },
            {
              id: "expense",
              label: "Ajoute une première dépense",
              hint: "Voyou calcule qui doit quoi",
              done: expenses.length > 0,
              onClick: () => router.push(`/trips/${tripId}/budget?new=expense`),
            },
            ...(features.hasPlanning
              ? [
                  {
                    id: "step",
                    label: "Planifie une première étape",
                    hint: "Activité, resto ou trajet",
                    done: itineraryItems.length > 0,
                    onClick: () => router.push(`/trips/${tripId}/planning?new=step`),
                  },
                ]
              : []),
          ]}
        />
      </StaggerItem>

      {/* ── Budget (hidden while empty: « Premiers pas » asks for the first expense) ── */}
      {(expenses.length > 0 || !!trip.totalBudget) && (
      <StaggerItem className="lg:mb-5 lg:break-inside-avoid">
        <section className="rounded-[1.75rem] bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <Link href={`/trips/${tripId}/budget`} className="group flex items-center gap-1 text-sm font-semibold text-muted-foreground">
              Dépensé
              <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <button
              type="button"
              onClick={() => setBudgetOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              <Pencil size={13} />
              {trip.totalBudget ? "Budget" : "Définir un budget"}
            </button>
          </div>

          <Link href={`/trips/${tripId}/budget`} className="block outline-none">
            <div className="mt-1 flex items-baseline gap-2">
              <NumberTicker
                value={totalSpent}
                format={formatMoney}
                className="tabular font-display text-[2.75rem] leading-none font-extrabold tracking-[-0.035em]"
              />
              {trip.totalBudget ? (
                <span className="text-[0.95rem] text-muted-foreground">sur {formatMoney(trip.totalBudget)}</span>
              ) : null}
            </div>

            {trip.totalBudget ? (
              <>
                <div
                  className="mt-4 h-2.5 overflow-hidden rounded-full bg-foreground/[0.07]"
                  role="progressbar"
                  aria-label="Budget utilisé"
                  aria-valuenow={Math.round(budgetPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <motion.div
                    className={cn("h-full rounded-full", barTone)}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(budgetPct, 100)}%` }}
                    transition={{ duration: 1, ease: EASE_OUT, delay: 0.2 }}
                  />
                </div>
                <p className="mt-2.5 text-sm text-muted-foreground">
                  {remaining >= 0 ? (
                    <>
                      Il reste <span className="font-semibold text-foreground">{formatMoney(remaining)}</span> · {Math.round(budgetPct)} % utilisé
                    </>
                  ) : (
                    <span className="font-semibold text-red-400">Dépassé de {formatMoney(-remaining)}</span>
                  )}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {expenses.length} dépense{expenses.length !== 1 ? "s" : ""} au total
              </p>
            )}

            {categoryBreakdown.length > 0 && totalSpent > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                  {categoryBreakdown.map(([cat, amount], i) => (
                    <motion.span
                      key={cat}
                      className={cn("h-full rounded-full", CATEGORY_FILL[cat])}
                      initial={{ flexGrow: 0 }}
                      animate={{ flexGrow: amount }}
                      transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.3 + i * 0.05 }}
                      style={{ flexBasis: 0 }}
                    />
                  ))}
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                  {categoryBreakdown.slice(0, 4).map(([cat, amount]) => (
                    <li key={cat} className="flex min-w-0 items-center gap-2 text-sm">
                      <span className={cn("size-2 shrink-0 rounded-full", CATEGORY_FILL[cat])} />
                      <span className="truncate text-muted-foreground">{CATEGORIES[cat].label}</span>
                      <span className="tabular ml-auto font-medium">{Math.round((amount / totalSpent) * 100)} %</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Link>
        </section>
      </StaggerItem>
      )}

      {/* ── Balances ─────────────────────────────────────────── */}
      {me && expenses.length > 0 && (
        <StaggerItem className="lg:mb-5 lg:break-inside-avoid">
          {iOweTotal < 0.01 && owedTotal < 0.01 ? (
            <Link
              href={`/trips/${tripId}/budget?tab=balances`}
              className="pressable flex items-center gap-4 rounded-[1.5rem] bg-emerald-500/12 p-4"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                <Check size={22} strokeWidth={2.6} />
              </span>
              <span>
                <span className="block font-semibold text-emerald-300">Tu es à jour</span>
                <span className="block text-sm text-muted-foreground">Personne ne te doit rien, tu ne dois rien.</span>
              </span>
            </Link>
          ) : (
            <div className={cn("grid gap-3", iOweTotal >= 0.01 && owedTotal >= 0.01 && "grid-cols-2")}>
              {iOweTotal >= 0.01 && (
                <BalanceTile
                  href={`/trips/${tripId}/budget?tab=balances`}
                  tone="owe"
                  label="Tu dois"
                  amount={formatMoney(iOweTotal)}
                  people={iOwe.map((s) => s.toId)}
                  participants={trip.participants}
                  detail={iOwe.length === 1 ? `à ${nameOf(iOwe[0].toId)}` : `à ${iOwe.length} personnes`}
                  wide={owedTotal < 0.01}
                />
              )}
              {owedTotal >= 0.01 && (
                <BalanceTile
                  href={`/trips/${tripId}/budget?tab=balances`}
                  tone="owed"
                  label="On te doit"
                  amount={formatMoney(owedTotal)}
                  people={owedToMe.map((s) => s.fromId)}
                  participants={trip.participants}
                  detail={owedToMe.length === 1 ? `${nameOf(owedToMe[0].fromId)} te doit` : `${owedToMe.length} personnes`}
                  wide={iOweTotal < 0.01}
                />
              )}
            </div>
          )}
        </StaggerItem>
      )}

      {/* ── Planning ─────────────────────────────────────────── */}
      {shown.hasPlanning && (
        <StaggerItem className="lg:mb-5 lg:break-inside-avoid">
          <DayAgendaCard items={itineraryItems} today={today} planningHref={`/trips/${tripId}/planning`} />
        </StaggerItem>
      )}

      {/* ── Listes : ce qu'on attend de moi ─────────────────── */}
      {shown.hasLists && (
        <StaggerItem className="lg:mb-5 lg:break-inside-avoid">
          <MyListCard tripId={trip.id} myId={trip.myParticipantId ?? null} />
        </StaggerItem>
      )}

      {/* ── Menus du jour ────────────────────────────────────── */}
      {shown.hasMenus && todayMeals.length > 0 && (
        <StaggerItem className="lg:mb-5 lg:break-inside-avoid">
          <section className="rounded-[1.75rem] bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[1.15rem] font-bold tracking-tight">Au menu aujourd&apos;hui</h2>
              <Link href={`/trips/${tripId}/menus`} className="-mr-2 flex h-9 items-center gap-0.5 rounded-full px-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                Menus
                <ChevronRight size={16} />
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-border">
              {todayMeals.map((meal) => {
                const slot = SLOT_CONFIG[meal.slot];
                const Icon = slot.icon;
                const what = meal.dishes.length > 0 ? meal.dishes.map((d) => d.name).join(" · ") : meal.title ?? "À définir";
                return (
                  <li key={meal.id}>
                    <Link href={`/trips/${tripId}/menus?date=${today}`} className="flex items-center gap-3.5 py-3">
                      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", slot.bgClass, slot.textClass)}>
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-muted-foreground">{slot.label}</span>
                        <span className="block truncate font-medium">{what}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </StaggerItem>
      )}

      <BudgetEditDialog
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        currency={trip.currency}
        initialValue={trip.totalBudget}
        participantCount={trip.participants.length}
        onSave={async (val) => {
          await updateTrip({ totalBudget: val });
        }}
      />

      {identityMounted && <IdentityDialog tripId={trip.id} open={identityOpen} onOpenChange={setIdentityOpen} />}
    </Stagger>
  );
}

function BalanceTile({
  href,
  tone,
  label,
  amount,
  detail,
  people,
  participants,
  wide,
}: {
  href: string;
  tone: "owe" | "owed";
  label: string;
  amount: string;
  detail: string;
  people: string[];
  participants: Participant[];
  wide?: boolean;
}) {
  const faces = people
    .map((id) => participants.find((p) => p.id === id))
    .filter((p): p is Participant => !!p);
  return (
    <Link
      href={href}
      className={cn(
        "pressable flex items-center gap-3 rounded-[1.5rem] p-4",
        tone === "owe" ? "bg-rose-500/12" : "bg-emerald-500/12"
      )}
    >
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-semibold", tone === "owe" ? "text-rose-300" : "text-emerald-300")}>{label}</span>
        <span
          className={cn(
            "tabular mt-1 block font-display leading-tight font-extrabold tracking-tight",
            wide ? "text-[2rem]" : "text-[1.75rem]",
            tone === "owe" ? "text-rose-200" : "text-emerald-200"
          )}
        >
          {amount}
        </span>
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">{detail}</span>
      </span>
      {wide && faces.length > 0 && (
        <span className="flex shrink-0 items-center">
          <ParticipantStack participants={faces} size="sm" max={3} showLabel={false} />
          <ChevronRight size={18} className="ml-1 text-muted-foreground" />
        </span>
      )}
    </Link>
  );
}
