"use client";

import { ArrowRightLeft, History, Map, Pencil, Plus, Receipt, Trash2, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { CATEGORIES } from "@/lib/budget/categories";
import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import type { ActivityAction, ActivityEntity, ActivityEntry } from "@/types";

const ACTION_ICON: Record<ActivityAction, LucideIcon> = { created: Plus, updated: Pencil, deleted: Trash2 };
const ACTION_TONE: Record<ActivityAction, string> = {
  created: "bg-emerald-500/12 text-emerald-500",
  updated: "bg-foreground/[0.07] text-foreground",
  deleted: "bg-red-500/12 text-red-400",
};
const ENTITY_ICON: Record<ActivityEntity, LucideIcon> = { expense: Receipt, settlement: ArrowRightLeft, step: Map };

const VERB: Record<ActivityEntity, Record<ActivityAction, string>> = {
  expense: { created: "a ajouté la dépense", updated: "a modifié la dépense", deleted: "a supprimé la dépense" },
  settlement: { created: "a enregistré le remboursement", updated: "a modifié le remboursement", deleted: "a supprimé le remboursement" },
  step: { created: "a ajouté l'étape", updated: "a modifié l'étape", deleted: "a supprimé l'étape" },
};

function when(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function changes(entry: ActivityEntry, currency: string): string[] {
  const out: string[] = [];
  const d = entry.details;
  if (d.title) out.push(`titre : « ${d.title.from} » → « ${d.title.to} »`);
  if (d.amount) out.push(`montant : ${formatCurrency(d.amount.from, currency)} → ${formatCurrency(d.amount.to, currency)}`);
  if (d.date) out.push(`date : ${d.date.from} → ${d.date.to}`);
  if (d.category) {
    const label = (c: string) => CATEGORIES[c as keyof typeof CATEGORIES]?.label ?? c;
    out.push(`catégorie : ${label(d.category.from)} → ${label(d.category.to)}`);
  }
  if (d.payers) out.push("qui a payé");
  if (d.splits) out.push("la répartition");
  return out;
}

export function ActivityList({ entries, currency }: { entries: ActivityEntry[]; currency: string }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Rien à signaler"
        description="Ici, on garde la trace de qui ajoute, modifie ou supprime une dépense. Pour que les comptes restent clairs pour tout le monde."
      />
    );
  }

  return (
    <ul className="overflow-hidden rounded-[1.5rem] bg-card shadow-card">
      {entries.map((e, i) => {
        const Icon = ACTION_ICON[e.action];
        const EntityIcon = ENTITY_ICON[e.entity];
        const diff = e.action === "updated" ? changes(e, currency) : [];
        return (
          <li key={e.id} className={cn("flex gap-3.5 px-4 py-3.5", i > 0 && "border-t border-border")}>
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl", ACTION_TONE[e.action])}>
              <Icon size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.95rem] leading-snug">
                <span className="font-semibold">{e.actorName ?? "Quelqu'un"}</span>{" "}
                <span className="text-muted-foreground">{VERB[e.entity][e.action]}</span>{" "}
                <span className="inline-flex items-center gap-1 font-semibold">
                  <EntityIcon size={13} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                  <span className="[overflow-wrap:anywhere]">{e.title ?? "sans titre"}</span>
                </span>
                {e.amount !== null && e.entity !== "step" && e.action !== "updated" && (
                  <span className="tabular text-muted-foreground"> · {formatCurrency(e.amount, currency)}</span>
                )}
              </p>
              {diff.length > 0 && <p className="mt-0.5 text-sm text-muted-foreground">{diff.join(" · ")}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">{when(e.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
