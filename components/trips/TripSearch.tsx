"use client";

import { featuresWithContent } from "@/lib/trip-features";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { m as motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, Check, ListChecks, Scale, Search, UtensilsCrossed, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import { useBudget } from "@/hooks/useBudget";
import { useItinerary } from "@/hooks/useItinerary";
import { useMeals } from "@/hooks/useMeals";
import { useChecklist } from "@/hooks/useChecklist";
import { CATEGORIES } from "@/lib/budget/categories";
import { ITINERARY_TYPES, itemTitle } from "@/lib/itinerary-types";
import { SLOT_CONFIG } from "@/lib/meals/slots";
import { formatCurrency } from "@/lib/format-currency";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Trip } from "@/types";

/** Lower-case, accent-free text for forgiving matching ("cafe" finds "Café"). */
function norm(s: string | null | undefined): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

interface Result {
  id: string;
  title: string;
  subtitle: string;
  trailing?: string;
  href: string;
  icon: React.ReactNode;
}

export function TripSearch({ trip, open, onOpenChange }: { trip: Trip; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-0 p-0" style={{ height: "92dvh" }} showCloseButton={false}>
        <SheetTitle className="sr-only">Rechercher dans le voyage</SheetTitle>
        {open && <SearchBody trip={trip} onClose={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function SearchBody({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { expenses } = useBudget(trip.id);
  const { items } = useItinerary(trip.id);
  const { meals } = useMeals(trip.id);
  const { items: listItems } = useChecklist(trip.id);
  const base = `/trips/${trip.id}`;
  const nameOf = (id: string) => trip.participants.find((p) => p.id === id)?.name ?? "";

  const sections = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return [];
    const match = (...fields: (string | null | undefined)[]) => fields.some((f) => norm(f).includes(q));

    const expenseResults: Result[] = expenses
      .filter((e) => match(e.title, CATEGORIES[e.category]?.label, e.notes, ...e.payers.map((p) => nameOf(p.participantId))))
      .slice(0, 8)
      .map((e) => {
        const cfg = CATEGORIES[e.category] ?? CATEGORIES.other;
        const Icon = cfg.icon;
        return {
          id: e.id,
          title: e.title,
          subtitle: `${shortDate(e.date)} · payé par ${e.payers.map((p) => nameOf(p.participantId)).join(" & ")}`,
          trailing: formatCurrency(e.amountInTripCurrency, trip.currency),
          href: `${base}/budget?expense=${e.id}`,
          icon: (
            <span className={cn("flex size-10 items-center justify-center rounded-2xl", cfg.bg)}>
              <Icon size={18} className={cfg.color} />
            </span>
          ),
        };
      });

    const planningResults: Result[] = items
      .filter((i) => match(i.title, i.location, i.destination, i.description, ITINERARY_TYPES[i.type].label))
      .slice(0, 8)
      .map((i) => {
        const cfg = ITINERARY_TYPES[i.type];
        const Icon = cfg.icon;
        return {
          id: i.id,
          title: itemTitle(i),
          subtitle: [shortDate(i.date), i.time?.slice(0, 5), i.location?.split(",")[0]].filter(Boolean).join(" · "),
          href: `${base}/planning?date=${i.date}&item=${i.id}`,
          icon: (
            <span className={cn("flex size-10 items-center justify-center rounded-2xl", cfg.tile)}>
              <Icon size={18} />
            </span>
          ),
        };
      });

    const mealResults: Result[] = meals
      .filter((m) =>
        match(m.title, m.notes, SLOT_CONFIG[m.slot].label, ...m.dishes.map((d) => d.name), ...m.dishes.flatMap((d) => d.ingredients.map((x) => x.name)))
      )
      .slice(0, 8)
      .map((m) => {
        const slot = SLOT_CONFIG[m.slot];
        const Icon = slot.icon;
        return {
          id: m.id,
          title: m.dishes.length ? m.dishes.map((d) => d.name).join(" · ") : m.title ?? slot.label,
          subtitle: `${slot.label} · ${shortDate(m.date)}`,
          href: `${base}/menus?date=${m.date}`,
          icon: (
            <span className={cn("flex size-10 items-center justify-center rounded-2xl", slot.bgClass, slot.textClass)}>
              <Icon size={18} />
            </span>
          ),
        };
      });

    const listResults: Result[] = listItems
      .filter((i) => match(i.title, i.note, ...i.assigneeIds.map(nameOf)))
      .slice(0, 8)
      .map((i) => {
        const who = i.assigneeIds.map(nameOf).filter(Boolean).join(", ");
        return {
          id: i.id,
          title: i.title,
          subtitle: [i.list === "bring" ? "À apporter" : "À faire", who || "Personne pour l'instant", i.done ? "fait" : null].filter(Boolean).join(" · "),
          href: `${base}/lists?item=${i.id}`,
          icon: (
            <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-400">
              {i.done ? <Check size={18} strokeWidth={2.6} /> : <ListChecks size={18} />}
            </span>
          ),
        };
      });

    const peopleResults: Result[] = trip.participants
      .filter((p) => match(p.name))
      .map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: "Voir les soldes",
        href: `${base}/budget?tab=balances`,
        icon: <ParticipantAvatar participant={p} size="md" />,
      }));

    return [
      { title: "Dépenses", results: expenseResults },
      { title: "Planning", results: planningResults },
      { title: "Repas", results: mealResults },
      { title: "Listes", results: listResults },
      { title: "Participants", results: peopleResults },
    ].filter((s) => s.results.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, expenses, items, meals, listItems, trip]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const shown = featuresWithContent(trip, { planning: items.length, menus: meals.length, lists: listItems.length });
  const shortcuts = [
    { label: "Qui doit quoi", href: `${base}/budget?tab=balances`, icon: Scale, show: true },
    { label: "Le planning du jour", href: `${base}/planning`, icon: CalendarDays, show: shown.hasPlanning },
    { label: "Les repas du jour", href: `${base}/menus`, icon: UtensilsCrossed, show: shown.hasMenus },
    { label: "Qui ramène quoi", href: `${base}/lists`, icon: ListChecks, show: shown.hasLists },
  ].filter((s) => s.show);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-4 pt-10 pb-3">
        <label className="relative flex-1">
          <span className="sr-only">Rechercher</span>
          <Search size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Dépense, lieu, plat…"
            className="h-12 w-full rounded-full bg-secondary pr-10 pl-11 text-base outline-none placeholder:text-muted-foreground focus:ring-4 focus:ring-primary/12"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Effacer"
              className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06]"
            >
              <X size={16} />
            </button>
          )}
        </label>
        <button type="button" onClick={onClose} className="h-11 shrink-0 rounded-full px-3 text-[0.95rem] font-semibold text-primary">
          Fermer
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {!query.trim() ? (
          <div className="pt-2">
            <p className="mb-2 px-2 text-sm font-semibold text-muted-foreground">Raccourcis</p>
            <ul className="overflow-hidden rounded-[1.25rem] bg-secondary">
              {shortcuts.map((s, i) => (
                <li key={s.label}>
                  <button
                    type="button"
                    onClick={() => go(s.href)}
                    className={cn("flex min-h-13 w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-foreground/[0.06]", i > 0 && "border-t border-border")}
                  >
                    <s.icon size={19} className="text-primary" />
                    <span className="flex-1 font-medium">{s.label}</span>
                    <ArrowUpRight size={17} className="text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : sections.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 pt-16 text-center">
            <p className="font-display text-lg font-bold">Aucun résultat</p>
            <p className="text-[0.95rem] text-muted-foreground">Essaie un autre mot : un lieu, un plat, un prénom…</p>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {sections.map((section) => (
              <motion.section
                key={section.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                <p className="mb-2 px-2 text-sm font-semibold text-muted-foreground">{section.title}</p>
                <ul className="overflow-hidden rounded-[1.25rem] bg-card shadow-card">
                  {section.results.map((r, i) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => go(r.href)}
                        className="flex w-full items-center gap-3 px-3 text-left transition-colors active:bg-secondary"
                      >
                        <span className="shrink-0">{r.icon}</span>
                        <span className={cn("flex min-w-0 flex-1 items-center gap-3 py-3", i > 0 && "border-t border-border")}>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{r.title}</span>
                            <span className="block truncate text-sm text-muted-foreground first-letter:uppercase">{r.subtitle}</span>
                          </span>
                          {r.trailing && <span className="tabular shrink-0 font-display font-bold">{r.trailing}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
