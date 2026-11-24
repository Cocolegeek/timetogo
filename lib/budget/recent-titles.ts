import type { Expense, ExpenseCategory } from "@/types";

export interface RecentTitle {
  title: string;
  category: ExpenseCategory;
}

/** Les derniers intitulés distincts (hors remboursements) : « Courses », « Resto »… un seul toucher pour les réutiliser. */
export function recentTitles(expenses: Pick<Expense, "title" | "category" | "createdAt">[], limit = 5): RecentTitle[] {
  const seen = new Set<string>();
  const out: RecentTitle[] = [];
  const sorted = [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const e of sorted) {
    const title = e.title.trim();
    const key = title.toLowerCase();
    if (!title || e.category === "reimbursement" || seen.has(key)) continue;
    seen.add(key);
    out.push({ title, category: e.category });
    if (out.length >= limit) break;
  }
  return out;
}
