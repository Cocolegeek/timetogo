"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, Loader2, ChefHat } from "lucide-react";
import { RecipeSearch } from "./RecipeSearch";
import type { RecipeResult } from "@/lib/meals/themealdb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SLOT_CONFIG } from "@/lib/meals/slots";
import { cn } from "@/lib/utils";
import type { Dish, Meal, Participant } from "@/types";

interface MealEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: Meal | null;
  participants: Participant[];
  onSave: (data: {
    title: string;
    notes?: string;
    participantIds: string[];
    dishes: Dish[];
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function MealEditDialog({
  open,
  onOpenChange,
  meal,
  participants,
  onSave,
  onDelete,
}: MealEditDialogProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [recipeSearchOpen, setRecipeSearchOpen] = useState(false);

  // Hydrate when dialog opens
  useEffect(() => {
    if (!open || !meal) return;
    setTitle(meal.title);
    setNotes(meal.notes ?? "");
    setParticipantIds(meal.participantIds ?? []);
    setDishes(meal.dishes ?? []);
    setConfirmDelete(false);
  }, [open, meal]);

  const slotEmoji = meal ? SLOT_CONFIG[meal.slot].emoji : "";

  // Participant toggling
  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const allSelected =
    participants.length > 0 && participantIds.length === participants.length;
  const toggleAll = () => {
    setParticipantIds(allSelected ? [] : participants.map((p) => p.id));
  };

  // Dishes
  const addDish = () => {
    setDishes((prev) => [
      ...prev,
      { id: uuidv4(), name: "", ingredients: [] },
    ]);
  };
  const importRecipe = (recipe: RecipeResult) => {
    setDishes((prev) => [
      ...prev,
      { id: uuidv4(), name: recipe.name, ingredients: recipe.ingredients },
    ]);
  };
  const removeDish = (id: string) => {
    setDishes((prev) => prev.filter((d) => d.id !== id));
  };
  const updateDishName = (id: string, name: string) => {
    setDishes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, name } : d))
    );
  };
  const addIngredient = (dishId: string, ingredient: string) => {
    const trimmed = ingredient.trim();
    if (!trimmed) return;
    setDishes((prev) =>
      prev.map((d) =>
        d.id === dishId
          ? { ...d, ingredients: [...d.ingredients, trimmed] }
          : d
      )
    );
  };
  const removeIngredient = (dishId: string, idx: number) => {
    setDishes((prev) =>
      prev.map((d) =>
        d.id === dishId
          ? {
              ...d,
              ingredients: d.ingredients.filter((_, i) => i !== idx),
            }
          : d
      )
    );
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      // Drop empty dishes (no name)
      const cleanedDishes = dishes
        .filter((d) => d.name.trim().length > 0)
        .map((d) => ({ ...d, name: d.name.trim() }));

      await onSave({
        title: title.trim(),
        notes: notes.trim() || undefined,
        participantIds,
        dishes: cleanedDishes,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSaving(true);
    try {
      await onDelete();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glass-strong border-white/10 max-w-md p-0 max-h-[92vh] overflow-hidden flex flex-col"
        showCloseButton={false}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/8">
          <DialogTitle className="text-slate-100 text-xl flex items-center gap-2">
            <span>{slotEmoji}</span>
            <span>Modifier le repas</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm font-medium">Titre</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Petit-déjeuner"
              className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* Participants */}
          {participants.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 text-sm font-medium">
                  Avec qui ?{" "}
                  <span className="text-slate-500 font-normal">(optionnel)</span>
                </Label>
                {participantIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setParticipantIds([])}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Effacer
                  </button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={toggleAll}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95",
                    allSelected
                      ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/40"
                      : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                  )}
                >
                  Tout le monde
                </button>
                {participants.map((p) => {
                  const selected = participantIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleParticipant(p.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all active:scale-95",
                        selected
                          ? "border-indigo-400 bg-indigo-500/15 text-indigo-200"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
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
            </div>
          )}

          {/* Dishes */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm font-medium">
              Plats{" "}
              <span className="text-slate-500 font-normal">
                ({dishes.length})
              </span>
            </Label>

            <AnimatePresence initial={false}>
              {dishes.map((dish) => (
                <motion.div
                  key={dish.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <DishEditor
                    dish={dish}
                    onNameChange={(name) => updateDishName(dish.id, name)}
                    onAddIngredient={(ing) => addIngredient(dish.id, ing)}
                    onRemoveIngredient={(idx) => removeIngredient(dish.id, idx)}
                    onRemove={() => removeDish(dish.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={addDish}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/15 text-slate-400 hover:border-white/25 hover:text-slate-200 hover:bg-white/4 active:scale-[0.99] transition-all text-sm font-medium"
              >
                <Plus size={16} />
                Plat vide
              </button>
              <button
                type="button"
                onClick={() => setRecipeSearchOpen(true)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 active:scale-[0.99] transition-all text-sm font-medium"
              >
                <ChefHat size={16} />
                Importer recette
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm font-medium">
              Notes <span className="text-slate-500 font-normal">(optionnel)</span>
            </Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, restaurants envisagés…"
              rows={2}
              className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/40 resize-none"
            />
          </div>

          {/* Delete (only if onDelete provided) */}
          {onDelete && (
            <div className="pt-2 border-t border-white/8">
              {confirmDelete ? (
                <div className="space-y-2">
                  <p className="text-sm text-red-300 text-center">
                    Confirmer la suppression de ce repas ?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 text-slate-300 hover:bg-white/8"
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleDelete}
                      disabled={saving}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                  Supprimer ce repas
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t border-white/8 bg-slate-900/50"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
          }}
        >
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-slate-400 hover:text-slate-200 hover:bg-white/8"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex-1 gradient-primary text-white border-0 disabled:opacity-40"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Enregistrer"
              )}
            </Button>
          </div>
        </div>

        {/* Nested recipe search */}
        <RecipeSearch
          open={recipeSearchOpen}
          onOpenChange={setRecipeSearchOpen}
          onSelect={importRecipe}
        />
      </DialogContent>
    </Dialog>
  );
}

function DishEditor({
  dish,
  onNameChange,
  onAddIngredient,
  onRemoveIngredient,
  onRemove,
}: {
  dish: Dish;
  onNameChange: (name: string) => void;
  onAddIngredient: (ingredient: string) => void;
  onRemoveIngredient: (idx: number) => void;
  onRemove: () => void;
}) {
  const [ingredient, setIngredient] = useState("");

  const submitIngredient = () => {
    if (!ingredient.trim()) return;
    onAddIngredient(ingredient);
    setIngredient("");
  };

  return (
    <div className="rounded-xl border border-white/8 bg-white/4 p-3 space-y-2.5 mb-2">
      <div className="flex items-center gap-2">
        <input
          value={dish.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nom du plat"
          className="flex-1 bg-transparent border-0 outline-none text-base font-semibold text-slate-100 placeholder:text-slate-500"
        />
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          aria-label="Retirer le plat"
        >
          <X size={14} />
        </button>
      </div>

      {/* Ingredient chips */}
      {dish.ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dish.ingredients.map((ing, i) => (
            <span
              key={`${i}-${ing}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/8 text-sm text-slate-200"
            >
              {ing}
              <button
                type="button"
                onClick={() => onRemoveIngredient(i)}
                className="text-slate-500 hover:text-red-400"
                aria-label={`Retirer ${ing}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add ingredient */}
      <div className="flex gap-2">
        <Input
          value={ingredient}
          onChange={(e) => setIngredient(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitIngredient();
            }
          }}
          placeholder="Ajouter un ingrédient"
          className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500 h-9"
        />
        <button
          type="button"
          onClick={submitIngredient}
          disabled={!ingredient.trim()}
          className="shrink-0 px-3 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 disabled:opacity-40 transition-colors"
          aria-label="Ajouter l'ingrédient"
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}
