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
import { SLOT_CONFIG } from "@/lib/meals/slots";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/meals/categories";
import { cn } from "@/lib/utils";
import type {
  Dish,
  DishCourse,
  Ingredient,
  Meal,
  MealCategory,
  Participant,
} from "@/types";

const COURSES: { id: DishCourse; label: string; emoji: string }[] = [
  { id: "starter", label: "Entrée",   emoji: "🥗" },
  { id: "main",    label: "Plat",     emoji: "🍽️" },
  { id: "cheese",  label: "Fromage",  emoji: "🧀" },
  { id: "dessert", label: "Dessert",  emoji: "🍰" },
  { id: "other",   label: "Autre",    emoji: "🍴" },
];

const COURSE_BY_ID: Record<DishCourse, (typeof COURSES)[number]> =
  Object.fromEntries(COURSES.map((c) => [c.id, c])) as never;

const COURSE_ORDER: DishCourse[] = ["starter", "main", "cheese", "dessert", "other"];

function newDish(course: DishCourse = "main"): Dish {
  return { id: uuidv4(), course, name: "", ingredients: [] };
}

function newIngredient(): Ingredient {
  return { id: uuidv4(), name: "", quantity: "" };
}

interface MealEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: Meal | null;
  participants: Participant[];
  onSave: (data: {
    title: string | null;
    category: MealCategory;
    notes?: string | null;
    participantIds: string[];
    cookIds: string[];
    dishes: Dish[];
  }) => Promise<void>;
}

type MealNavTab = "Infos" | "Qui" | "Plats";

export function MealEditDialog({
  open,
  onOpenChange,
  meal,
  participants,
  onSave,
}: MealEditDialogProps) {
  const [activeTab, setActiveTab] = useState<MealNavTab>("Infos");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MealCategory>("home");
  const [notes, setNotes] = useState("");
  const [eaterIds, setEaterIds] = useState<string[]>([]);
  const [cookIds, setCookIds] = useState<string[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [expandedDish, setExpandedDish] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !meal) return;
    setActiveTab("Infos");
    setTitle(meal.title ?? "");
    setCategory(meal.category);
    setNotes(meal.notes ?? "");
    setEaterIds(
      meal.participantIds.length === 0
        ? participants.map((p) => p.id)
        : meal.participantIds
    );
    setCookIds(meal.cookIds ?? []);
    setDishes(meal.dishes ?? []);
    setExpandedDish(meal.dishes?.[0]?.id ?? null);
    setErrorMsg(null);
  }, [open, meal, participants]);

  const slotCfg = meal ? SLOT_CONFIG[meal.slot] : null;
  const isRestaurant = category === "restaurant";

  // If user switches to restaurant while on Plats tab, jump back to Infos
  useEffect(() => {
    if (isRestaurant && activeTab === "Plats") setActiveTab("Infos");
  }, [isRestaurant, activeTab]);

  const tabs: MealNavTab[] = isRestaurant
    ? ["Infos", "Qui"]
    : ["Infos", "Qui", "Plats"];

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

  // ── Dish management ─────────────────────────────────────────────────────
  const addDish = () => {
    const existingCourses = new Set(dishes.map((d) => d.course));
    const nextCourse =
      COURSE_ORDER.find((c) => !existingCourses.has(c)) ?? "other";
    const dish = newDish(nextCourse);
    setDishes((prev) => [...prev, dish]);
    setExpandedDish(dish.id);
  };

  const updateDish = (id: string, patch: Partial<Dish>) => {
    setDishes((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const removeDish = (id: string) => {
    setDishes((prev) => prev.filter((d) => d.id !== id));
    if (expandedDish === id) setExpandedDish(null);
  };

  const addIngredient = (dishId: string) => {
    updateDish(dishId, {
      ingredients: [
        ...(dishes.find((d) => d.id === dishId)?.ingredients ?? []),
        newIngredient(),
      ],
    });
  };

  const updateIngredient = (
    dishId: string,
    ingId: string,
    field: "name" | "quantity",
    value: string
  ) => {
    const dish = dishes.find((d) => d.id === dishId);
    if (!dish) return;
    updateDish(dishId, {
      ingredients: dish.ingredients.map((ing) =>
        ing.id === ingId ? { ...ing, [field]: value } : ing
      ),
    });
  };

  const removeIngredient = (dishId: string, ingId: string) => {
    const dish = dishes.find((d) => d.id === dishId);
    if (!dish) return;
    updateDish(dishId, {
      ingredients: dish.ingredients.filter((ing) => ing.id !== ingId),
    });
  };

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const cleanedEaters =
        eaterIds.length === participants.length ? [] : eaterIds;

      const cleanedDishes: Dish[] = isRestaurant
        ? []
        : dishes
            .filter(
              (d) =>
                d.name.trim().length > 0 ||
                d.ingredients.some((ing) => ing.name.trim().length > 0)
            )
            .map((d) => ({
              ...d,
              name: d.name.trim(),
              ingredients: d.ingredients
                .filter((ing) => ing.name.trim().length > 0)
                .map((ing) => ({
                  ...ing,
                  name: ing.name.trim(),
                  quantity: ing.quantity.trim(),
                })),
            }));

      await onSave({
        title: title.trim() || null,
        category,
        notes: notes.trim() || null,
        participantIds: cleanedEaters,
        cookIds,
        dishes: cleanedDishes,
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
          "!fixed !top-0 !left-0 !translate-x-0 !translate-y-0",
          "!w-full !max-w-full !h-[100dvh]",
          "!rounded-none !p-0 !gap-0 !border-0",
          "sm:!top-1/2 sm:!left-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2",
          "sm:!max-w-md sm:!h-auto sm:!max-h-[92vh]",
          "sm:!rounded-2xl sm:!border sm:!border-foreground/10",
          "glass-strong flex flex-col overflow-hidden"
        )}
      >
        {/* App bar */}
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
            disabled={saving}
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

        {/* Tab navigation */}
        <div className="flex gap-1 px-5 py-2 border-b border-foreground/8 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === tab
                  ? "bg-section-soft text-section-soft ring-1 ring-section"
                  : "text-slate-400 hover:text-slate-200 hover:bg-foreground/8"
              )}
            >
              {tab}
              {tab === "Plats" && dishes.length > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({dishes.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Infos ── */}
          {activeTab === "Infos" && (
            <>
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

              <Section label="Note" hint="optionnel">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    isRestaurant ? "Le bistrot de Léa…" : "Ex: chez Léa, repas léger…"
                  }
                  className="bg-foreground/5 border-foreground/10 text-slate-100 placeholder:text-slate-500"
                />
              </Section>

              <Section
                label={isRestaurant ? "Réservation / notes" : "Notes"}
                hint="optionnel"
              >
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    isRestaurant
                      ? "Nom du resto, horaire, n° de réservation…"
                      : "Allergies, idées de courses…"
                  }
                  rows={3}
                  className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-3 focus:ring-section resize-none"
                />
              </Section>
            </>
          )}

          {/* ── Qui ── */}
          {activeTab === "Qui" && (
            <>
              {participants.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  Aucun participant — ajoute-en depuis l&apos;édition du voyage.
                </div>
              ) : (
                <>
                  {!isRestaurant && (
                    <Section
                      icon={<ChefHat size={14} className="text-amber-400/80" />}
                      label="Qui gère ?"
                      hint="optionnel"
                    >
                      <PeoplePills
                        participants={participants}
                        selected={cookIds}
                        onToggle={toggleCook}
                        selectedTone="amber"
                      />
                    </Section>
                  )}

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
                </>
              )}
            </>
          )}

          {/* ── Plats ── (caché si resto) */}
          {activeTab === "Plats" && !isRestaurant && (
            <Section label="Plats" hint={dishes.length > 0 ? `${dishes.length}` : undefined}>
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {dishes.map((dish) => (
                    <DishRow
                      key={dish.id}
                      dish={dish}
                      expanded={expandedDish === dish.id}
                      onToggle={() =>
                        setExpandedDish((prev) => (prev === dish.id ? null : dish.id))
                      }
                      onUpdate={(patch) => updateDish(dish.id, patch)}
                      onRemove={() => removeDish(dish.id)}
                      onAddIngredient={() => addIngredient(dish.id)}
                      onUpdateIngredient={(ingId, field, value) =>
                        updateIngredient(dish.id, ingId, field, value)
                      }
                      onRemoveIngredient={(ingId) => removeIngredient(dish.id, ingId)}
                    />
                  ))}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={addDish}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-foreground/15 text-sm text-slate-400 hover:border-section/40 hover:text-section-soft hover:bg-section/5 transition-colors"
                >
                  <Plus size={14} />
                  Ajouter un plat
                </button>
              </div>
            </Section>
          )}

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

// ─── DishRow ────────────────────────────────────────────────────────────────

function DishRow({
  dish,
  expanded,
  onToggle,
  onUpdate,
  onRemove,
  onAddIngredient,
  onUpdateIngredient,
  onRemoveIngredient,
}: {
  dish: Dish;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<Dish>) => void;
  onRemove: () => void;
  onAddIngredient: () => void;
  onUpdateIngredient: (id: string, field: "name" | "quantity", value: string) => void;
  onRemoveIngredient: (id: string) => void;
}) {
  const courseCfg = COURSE_BY_ID[dish.course];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className="rounded-xl border border-foreground/8 bg-foreground/4 overflow-hidden"
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-foreground/4 transition-colors min-w-0"
        >
          <span className="text-base shrink-0">{courseCfg.emoji}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0">
            {courseCfg.label}
          </span>
          {dish.name && (
            <span className="text-sm text-slate-200 truncate">— {dish.name}</span>
          )}
          <span className="flex-1" />
          <ChevronDown
            size={14}
            className={cn(
              "text-slate-500 transition-transform shrink-0",
              expanded && "rotate-180"
            )}
          />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="px-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          aria-label="Retirer le plat"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-foreground/8"
          >
            <div className="p-3 space-y-3">
              {/* Course select */}
              <div className="flex gap-1.5 flex-wrap">
                {COURSES.map((c) => {
                  const sel = c.id === dish.course;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onUpdate({ course: c.id })}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-95",
                        sel
                          ? "border-section bg-section-soft text-section-soft"
                          : "border-foreground/10 bg-foreground/4 text-slate-400 hover:bg-foreground/8"
                      )}
                    >
                      <span>{c.emoji}</span>
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dish name */}
              <Input
                value={dish.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Nom du plat (ex: œufs mimosa)"
                className="bg-foreground/5 border-foreground/10 text-slate-100 placeholder:text-slate-500"
              />

              {/* Ingredients */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-1">
                  Ingrédients
                </p>
                <AnimatePresence initial={false}>
                  {dish.ingredients.map((ing) => (
                    <motion.div
                      key={ing.id}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="grid grid-cols-[1fr_90px_30px] gap-1.5 items-center"
                    >
                      <Input
                        value={ing.name}
                        onChange={(e) =>
                          onUpdateIngredient(ing.id, "name", e.target.value)
                        }
                        placeholder="Tomates"
                        className="bg-foreground/5 border-foreground/10 text-slate-100 placeholder:text-slate-500 h-9 text-sm"
                      />
                      <Input
                        value={ing.quantity}
                        onChange={(e) =>
                          onUpdateIngredient(ing.id, "quantity", e.target.value)
                        }
                        placeholder="500g"
                        className="bg-foreground/5 border-foreground/10 text-slate-100 placeholder:text-slate-500 h-9 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveIngredient(ing.id)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label="Retirer l'ingrédient"
                      >
                        <Trash2 size={12} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={onAddIngredient}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-foreground/10 text-xs text-slate-500 hover:border-foreground/20 hover:text-slate-300 transition-colors"
                >
                  <Plus size={12} />
                  Ingrédient
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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
    <div className="px-5 py-4 border-t border-foreground/8 space-y-2.5 first:border-t-0">
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

function PeoplePills({
  participants,
  selected,
  onToggle,
  selectedTone,
}: {
  participants: Participant[];
  selected: string[];
  onToggle: (id: string) => void;
  selectedTone: "amber" | "section";
}) {
  const tones = {
    amber: "border-amber-400 bg-amber-500/15 text-amber-200",
    section: "border-section bg-section-soft text-section-soft",
  };
  return (
    <div className="flex gap-1.5 flex-wrap">
      {participants.map((p) => {
        const sel = selected.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all active:scale-95",
              sel
                ? tones[selectedTone]
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
  );
}
