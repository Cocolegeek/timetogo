"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Loader2,
  Trash2,
  ChefHat,
  Users,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SLOT_CONFIG } from "@/lib/meals/slots";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/meals/categories";
import { cn } from "@/lib/utils";
import type {
  Ingredient,
  Meal,
  MealCategory,
  Participant,
} from "@/types";

interface MealEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: Meal | null;
  participants: Participant[];
  onSave: (data: {
    title: string;
    category: MealCategory;
    notes?: string;
    participantIds: string[];
    cookIds: string[];
    ingredients: Ingredient[];
  }) => Promise<void>;
}

export function MealEditDialog({
  open,
  onOpenChange,
  meal,
  participants,
  onSave,
}: MealEditDialogProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MealCategory>("home");
  const [notes, setNotes] = useState("");
  const [eaterIds, setEaterIds] = useState<string[]>([]);
  const [cookIds, setCookIds] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [showLogistics, setShowLogistics] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hydrate when dialog opens
  useEffect(() => {
    if (!open || !meal) return;
    setTitle(meal.title);
    setCategory(meal.category);
    setNotes(meal.notes ?? "");
    // Default behaviour: empty `participant_ids` means "tout le monde" → check all in form
    setEaterIds(
      meal.participantIds.length === 0
        ? participants.map((p) => p.id)
        : meal.participantIds
    );
    setCookIds(meal.cookIds ?? []);
    setIngredients(meal.ingredients ?? []);
    setShowLogistics(
      (meal.ingredients?.length ?? 0) > 0 || !!meal.notes
    );
    setErrorMsg(null);
  }, [open, meal, participants]);

  const slotCfg = meal ? SLOT_CONFIG[meal.slot] : null;

  // ───── eaters / cooks toggles ─────
  const toggleEater = (id: string) => {
    setEaterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleCook = (id: string) => {
    setCookIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allEatersSelected =
    participants.length > 0 && eaterIds.length === participants.length;
  const toggleAllEaters = () =>
    setEaterIds(allEatersSelected ? [] : participants.map((p) => p.id));

  // ───── ingredients management ─────
  const addIngredient = () =>
    setIngredients((prev) => [
      ...prev,
      { id: uuidv4(), name: "", quantity: "" },
    ]);
  const updateIngredient = (
    id: string,
    field: "name" | "quantity",
    value: string
  ) =>
    setIngredients((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    );
  const removeIngredient = (id: string) =>
    setIngredients((prev) => prev.filter((ing) => ing.id !== id));

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      // If everyone is selected, store [] to keep semantic "tout le monde"
      const cleanedEaters =
        eaterIds.length === participants.length ? [] : eaterIds;
      // Drop empty ingredient rows
      const cleanedIngredients = ingredients
        .filter((i) => i.name.trim().length > 0)
        .map((i) => ({
          ...i,
          name: i.name.trim(),
          quantity: i.quantity.trim(),
        }));

      await onSave({
        title: title.trim(),
        category,
        notes: notes.trim() || undefined,
        participantIds: cleanedEaters,
        cookIds,
        ingredients: cleanedIngredients,
      });
      onOpenChange(false);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Erreur";
      const friendly =
        /column.*does not exist/i.test(raw) || /schema cache/i.test(raw)
          ? "Colonne manquante en base. Exécute la dernière migration SQL Supabase."
          : raw;
      setErrorMsg(friendly);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          // Mobile: full-screen sheet
          "!fixed !top-0 !left-0 !translate-x-0 !translate-y-0",
          "!w-full !max-w-full !h-[100dvh]",
          "!rounded-none !p-0 !gap-0 !border-0",
          // Desktop: centered modal
          "sm:!top-1/2 sm:!left-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2",
          "sm:!max-w-md sm:!h-auto sm:!max-h-[92vh]",
          "sm:!rounded-2xl sm:!border sm:!border-foreground/10",
          "glass-strong flex flex-col overflow-hidden"
        )}
      >
        {/* Top app bar */}
        <div
          className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-foreground/8"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.625rem)" }}
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fermer"
            className="p-2 -ml-1 rounded-xl text-slate-300 hover:bg-foreground/8 active:bg-foreground/12 transition-all"
          >
            <X size={22} />
          </button>
          <DialogTitle className="text-base font-semibold text-slate-100 flex items-center gap-1.5">
            {slotCfg && <span>{slotCfg.emoji}</span>}
            <span>{slotCfg?.shortLabel ?? "Repas"}</span>
          </DialogTitle>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className={cn(
              "px-4 h-10 rounded-full text-sm font-semibold transition-all",
              "gradient-primary text-white",
              "disabled:opacity-40 disabled:pointer-events-none",
              "active:scale-95"
            )}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : "OK"}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Title — big */}
          <div className="px-5 pt-5 pb-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ajouter un titre"
              className="w-full bg-transparent border-0 outline-none text-2xl font-bold text-slate-100 placeholder:text-slate-600 placeholder:font-normal"
              autoFocus
            />
          </div>

          {/* Category — three colored buttons */}
          <Section label="Catégorie">
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_ORDER.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const selected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95",
                      selected
                        ? cfg.badgeClass
                        : "bg-foreground/4 text-slate-400 border border-foreground/8 hover:bg-foreground/8"
                    )}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Cook — optional */}
          {participants.length > 0 && (
            <Section
              icon={<ChefHat size={14} className="text-amber-400/80" />}
              label="Qui gère ?"
              hint="optionnel"
            >
              <div className="flex gap-1.5 flex-wrap">
                {participants.map((p) => {
                  const sel = cookIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleCook(p.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all active:scale-95",
                        sel
                          ? "border-amber-400 bg-amber-500/15 text-amber-200"
                          : "border-foreground/10 bg-foreground/5 text-slate-300 hover:bg-foreground/10"
                      )}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Eaters */}
          {participants.length > 0 && (
            <Section
              icon={<Users size={14} className="text-slate-400" />}
              label="Qui mange ?"
            >
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={toggleAllEaters}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95",
                    allEatersSelected
                      ? "bg-section-soft text-section-soft border-section"
                      : "bg-foreground/5 text-slate-400 border-foreground/10 hover:bg-foreground/10"
                  )}
                >
                  Tout le monde
                </button>
                {participants.map((p) => {
                  const sel = eaterIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleEater(p.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all active:scale-95",
                        sel
                          ? "border-section bg-section-soft text-section-soft"
                          : "border-foreground/10 bg-foreground/5 text-slate-300 hover:bg-foreground/10"
                      )}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Logistics — collapsed by default */}
          <div className="border-t border-foreground/8">
            <button
              type="button"
              onClick={() => setShowLogistics((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-5 py-3.5 text-sm font-medium text-slate-300 hover:bg-foreground/4 active:bg-foreground/8 transition-colors"
            >
              <span>Détails logistiques</span>
              <ChevronDown
                size={16}
                className={cn(
                  "text-slate-500 transition-transform",
                  showLogistics && "rotate-180"
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {showLogistics && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-4">
                    {/* Ingredients table */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_120px_36px] gap-2 px-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Ingrédient
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Quantité
                        </p>
                        <span />
                      </div>

                      <AnimatePresence initial={false}>
                        {ingredients.map((ing) => (
                          <motion.div
                            key={ing.id}
                            layout
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="grid grid-cols-[1fr_120px_36px] gap-2 items-center"
                          >
                            <Input
                              value={ing.name}
                              onChange={(e) =>
                                updateIngredient(ing.id, "name", e.target.value)
                              }
                              placeholder="Tomates"
                              className="bg-foreground/5 border-foreground/10 text-slate-100 placeholder:text-slate-500"
                            />
                            <Input
                              value={ing.quantity}
                              onChange={(e) =>
                                updateIngredient(
                                  ing.id,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              placeholder="500g"
                              className="bg-foreground/5 border-foreground/10 text-slate-100 placeholder:text-slate-500"
                            />
                            <button
                              type="button"
                              onClick={() => removeIngredient(ing.id)}
                              className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              aria-label="Retirer l'ingrédient"
                            >
                              <Trash2 size={14} />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      <button
                        type="button"
                        onClick={addIngredient}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-foreground/15 text-sm text-slate-400 hover:border-foreground/25 hover:text-slate-200 hover:bg-foreground/4 transition-colors"
                      >
                        <Plus size={14} />
                        Ajouter un ingrédient
                      </button>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-1">
                        Notes
                      </p>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Allergies, restos envisagés…"
                        rows={2}
                        className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-3 focus:ring-section resize-none"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="px-5 py-3">
              <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            </div>
          )}

          <div
            aria-hidden
            style={{ height: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon,
  label,
  hint,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-t border-foreground/8 space-y-2.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          {label}
        </p>
        {hint && (
          <span className="text-xs text-slate-500 normal-case font-normal">
            ({hint})
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
