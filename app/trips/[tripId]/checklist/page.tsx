"use client";

import { use, useState } from "react";
import { Plus, CheckSquare, Check, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/layout/GlassCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useChecklist } from "@/hooks/useChecklist";
import { cn } from "@/lib/utils";
import type { ChecklistCategory } from "@/types";

interface ChecklistPageProps {
  params: Promise<{ tripId: string }>;
}

const CATEGORY_CONFIG: Record<
  ChecklistCategory,
  { label: string; emoji: string }
> = {
  documents: { label: "Documents", emoji: "🪪" },
  clothes: { label: "Vêtements", emoji: "👕" },
  electronics: { label: "Électronique", emoji: "💻" },
  health: { label: "Santé", emoji: "💊" },
  toiletries: { label: "Toilette", emoji: "🧴" },
  other: { label: "Autre", emoji: "📦" },
};

const QUICK_ITEMS: Record<ChecklistCategory, string[]> = {
  documents: ["Passeport", "Billet d'avion", "Assurance voyage", "Visa"],
  clothes: ["T-shirts", "Pantalons", "Sous-vêtements", "Chaussures de marche"],
  electronics: ["Chargeur téléphone", "Adaptateur prise", "Écouteurs", "Batterie externe"],
  health: ["Médicaments", "Crème solaire", "Anti-douleurs", "Pansements"],
  toiletries: ["Brosse à dents", "Dentifrice", "Rasoir", "Shampoing"],
  other: ["Guide de voyage", "Cadenas bagage", "Sac à dos", "Bouteille d'eau"],
};

export default function ChecklistPage({ params }: ChecklistPageProps) {
  const { tripId } = use(params);
  const { items, addItem, toggleItem, deleteItem, checkedCount, totalCount, refetch } =
    useChecklist(tripId);

  const [newText, setNewText] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<ChecklistCategory>("other");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 400);
  };

  const handleAdd = async () => {
    if (!newText.trim()) return;
    await addItem(newText.trim(), selectedCategory);
    setNewText("");
  };

  const addQuickItem = async (text: string, category: ChecklistCategory) => {
    const exists = items.some((i) => i.text.toLowerCase() === text.toLowerCase());
    if (!exists) await addItem(text, category);
  };

  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  const byCategory = items.reduce<Partial<Record<ChecklistCategory, typeof items>>>(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category]!.push(item);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-5">
      {/* Refresh action only — title is redundant with bottom nav */}
      <div className="flex justify-end -mt-1 -mb-2">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/8 active:bg-white/12 transition-all"
          title="Actualiser"
        >
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Progress */}
      {totalCount > 0 && (
        <GlassCard padding={false}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">
                {checkedCount} / {totalCount} items
              </span>
              <span className="text-xs text-slate-500">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress
              value={progress}
              className="h-2 bg-white/8 [&>div]:bg-emerald-500 [&>div]:transition-all"
            />
          </div>
        </GlassCard>
      )}

      {/* Add item */}
      <GlassCard>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              placeholder="Ajouter un item..."
              className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/50"
            />
            <Button
              onClick={handleAdd}
              className="shrink-0 gradient-primary text-white border-0"
            >
              <Plus size={16} />
            </Button>
          </div>

          {/* Category selector */}
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(CATEGORY_CONFIG) as ChecklistCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                  selectedCategory === cat
                    ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                )}
              >
                <span>{CATEGORY_CONFIG[cat].emoji}</span>
                {CATEGORY_CONFIG[cat].label}
              </button>
            ))}
          </div>

          {/* Quick add */}
          <div>
            <p className="text-xs text-slate-600 mb-2">Suggestions rapides :</p>
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_ITEMS[selectedCategory].map((text) => {
                const exists = items.some(
                  (i) => i.text.toLowerCase() === text.toLowerCase()
                );
                return (
                  <button
                    key={text}
                    onClick={() => addQuickItem(text, selectedCategory)}
                    disabled={exists}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs transition-all",
                      exists
                        ? "bg-white/3 text-slate-600 cursor-default line-through"
                        : "bg-white/8 text-slate-400 hover:bg-white/12 hover:text-slate-300"
                    )}
                  >
                    {text}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Items by category */}
      {items.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Checklist vide"
          description="Ajoute les items à ne pas oublier pour ton voyage."
        />
      ) : (
        <div className="space-y-4">
          {(Object.keys(CATEGORY_CONFIG) as ChecklistCategory[]).map((category) => {
            const catItems = byCategory[category];
            if (!catItems || catItems.length === 0) return null;
            const { label, emoji } = CATEGORY_CONFIG[category];

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{emoji}</span>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                    {label}
                  </p>
                  <span className="text-xs text-slate-600">
                    ({catItems.filter((i) => i.checked).length}/{catItems.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  <AnimatePresence>
                    {catItems.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div
                          className={cn(
                            "flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer group",
                            item.checked
                              ? "border-white/4 bg-white/2"
                              : "border-white/8 bg-white/4 hover:border-white/12"
                          )}
                          onClick={() => toggleItem(item.id)}
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                              item.checked
                                ? "border-emerald-500 bg-emerald-500"
                                : "border-slate-600 group-hover:border-slate-400"
                            )}
                          >
                            {item.checked && <Check size={11} className="text-white" />}
                          </div>
                          <span
                            className={cn(
                              "text-sm flex-1 transition-all",
                              item.checked
                                ? "line-through text-slate-600"
                                : "text-slate-300"
                            )}
                          >
                            {item.text}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItem(item.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1"
                          >
                            ×
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
