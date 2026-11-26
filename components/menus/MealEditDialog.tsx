"use client";

import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { m as motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, ChefHat, Users, ChevronDown, House, Link2, NotebookPen, Sandwich, Utensils, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, FULLSCREEN_DIALOG } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { HeroInput } from "@/components/forms/HeroInput";
import { PropertyChips, type PropertyChipItem } from "@/components/forms/PropertyChips";
import { FormFooter } from "@/components/forms/FormFooter";
import { SLOT_CONFIG } from "@/lib/meals/slots";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/meals/categories";
import { cn, firstName } from "@/lib/utils";
import { handleEnter } from "@/lib/forms/enter-next";
import { normalizeLink } from "@/lib/meals/link";
import { haptic } from "@/lib/haptics";
import { ParticipantPicker } from "@/components/shared/ParticipantPicker";
import { COURSES, COURSE_BY_ID } from "@/lib/meals/courses";
import type { Dish, DishCourse, Ingredient, Meal, MealCategory, Participant } from "@/types";

function newDish(course: DishCourse = "main", name = ""): Dish {
  return { id: uuidv4(), course, name, ingredients: [] };
}

function newIngredient(): Ingredient {
  return { id: uuidv4(), name: "", quantity: "" };
}

const FOLLOWING_COURSES: DishCourse[] = ["dessert", "starter", "cheese", "other"];

function nextCourse(dishes: Dish[]): DishCourse {
  if (dishes.length === 0) return "main";
  const used = new Set(dishes.map((d) => d.course));
  return FOLLOWING_COURSES.find((c) => !used.has(c)) ?? "other";
}

const CATEGORY_ICONS: Record<MealCategory, LucideIcon> = { home: House, picnic: Sandwich, restaurant: Utensils };

function peopleLabel(participants: Participant[], ids: string[], empty: string): string {
  const names = ids.map((id) => participants.find((p) => p.id === id)).filter((p): p is Participant => !!p).map((p) => firstName(p.name));
  if (names.length === 0) return empty;
  return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
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
    link?: string | null;
    participantIds: string[];
    cookIds: string[];
    dishes: Dish[];
  }) => Promise<void>;
}

export function MealEditDialog({ open, onOpenChange, meal, participants, onSave }: MealEditDialogProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MealCategory>("home");
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [eaterIds, setEaterIds] = useState<string[]>([]);
  const [cookIds, setCookIds] = useState<string[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [draft, setDraft] = useState("");
  const [expandedDish, setExpandedDish] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const draftRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !meal) return;
    setTitle(meal.title ?? "");
    setCategory(meal.category);
    setNotes(meal.notes ?? "");
    setLink(meal.link ?? "");
    setNoteOpen(!!(meal.title || meal.notes));
    setEaterIds(meal.participantIds.length === 0 ? participants.map((p) => p.id) : meal.participantIds);
    setCookIds(meal.cookIds ?? []);
    setDishes(meal.dishes ?? []);
    setDraft("");
    setExpandedDish(null);
    setErrorMsg(null);
  }, [open, meal, participants]);

  const slotCfg = meal ? SLOT_CONFIG[meal.slot] : null;
  const isRestaurant = category === "restaurant";

  const toggleEater = (id: string) => setEaterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleCook = (id: string) => setCookIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allEatersSelected = participants.length > 0 && eaterIds.length === participants.length;
  const toggleAllEaters = () => setEaterIds(allEatersSelected ? [] : participants.map((p) => p.id));

  // ── Plats ───────────────────────────────────────────────────────────────
  const addDishFromDraft = () => {
    const name = draft.trim();
    if (!name) return false;
    haptic("light");
    setDishes((prev) => [...prev, newDish(nextCourse(prev), name)]);
    setDraft("");
    draftRef.current?.focus();
    return true;
  };

  const updateDish = (id: string, patch: Partial<Dish>) => setDishes((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const removeDish = (id: string) => {
    setDishes((prev) => prev.filter((d) => d.id !== id));
    if (expandedDish === id) setExpandedDish(null);
  };

  const addIngredient = (dishId: string): string => {
    const ing = newIngredient();
    setDishes((prev) => prev.map((d) => (d.id === dishId ? { ...d, ingredients: [...d.ingredients, ing] } : d)));
    return ing.id;
  };
  const updateIngredient = (dishId: string, ingId: string, field: "name" | "quantity", value: string) =>
    setDishes((prev) =>
      prev.map((d) => (d.id === dishId ? { ...d, ingredients: d.ingredients.map((ing) => (ing.id === ingId ? { ...ing, [field]: value } : ing)) } : d))
    );
  const removeIngredient = (dishId: string, ingId: string) =>
    setDishes((prev) => prev.map((d) => (d.id === dishId ? { ...d, ingredients: d.ingredients.filter((ing) => ing.id !== ingId) } : d)));

  // ── Enregistrer ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    const linkValue = category === "home" ? null : normalizeLink(link);
    if (category !== "home" && link.trim() && !linkValue) {
      setErrorMsg("Ce lien n'a pas l'air valide.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const pending = draft.trim();
      const withDraft = !isRestaurant && pending ? [...dishes, newDish(nextCourse(dishes), pending)] : dishes;
      const cleanedEaters = eaterIds.length === participants.length ? [] : eaterIds;
      const cleanedDishes: Dish[] = isRestaurant
        ? []
        : withDraft
            .filter((d) => d.name.trim().length > 0 || d.ingredients.some((ing) => ing.name.trim().length > 0))
            .map((d) => ({
              ...d,
              name: d.name.trim(),
              ingredients: d.ingredients
                .filter((ing) => ing.name.trim().length > 0)
                .map((ing) => ({ ...ing, name: ing.name.trim(), quantity: ing.quantity.trim() })),
            }));

      await onSave({
        title: title.trim() || null,
        category,
        notes: notes.trim() || null,
        link: linkValue,
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

  const chips: PropertyChipItem[] = [
    {
      id: "category",
      icon: CATEGORY_ICONS[category],
      label: CATEGORY_CONFIG[category].label,
      filled: category !== "home",
      panel: (
        <div className="grid grid-cols-3 gap-2">
          {CATEGORY_ORDER.map((cat) => {
            const selected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={selected}
                onClick={() => setCategory(cat)}
                className={cn(
                  "pressable flex h-11 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  selected ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-foreground/[0.06]"
                )}
              >
                {CATEGORY_CONFIG[cat].label}
              </button>
            );
          })}
        </div>
      ),
    },
    ...(participants.length > 0
      ? ([
          {
            id: "eaters",
            icon: Users,
            label: allEatersSelected ? "Tout le monde" : peopleLabel(participants, eaterIds, "Personne"),
            filled: !allEatersSelected,
            issue: eaterIds.length === 0,
            panel: <ParticipantPicker participants={participants} selected={eaterIds} onToggle={toggleEater} onToggleAll={toggleAllEaters} />,
          },
          ...(!isRestaurant
            ? [
                {
                  id: "cooks",
                  icon: ChefHat,
                  label: cookIds.length > 0 ? `${peopleLabel(participants, cookIds, "")} cuisine` : "Qui gère ?",
                  filled: cookIds.length > 0,
                  panel: <ParticipantPicker participants={participants} selected={cookIds} onToggle={toggleCook} />,
                } satisfies PropertyChipItem,
              ]
            : []),
        ] satisfies PropertyChipItem[])
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={FULLSCREEN_DIALOG}>
        {/* App bar */}
        <div
          className="flex shrink-0 items-center gap-3 px-2 pb-1"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.625rem)" }}
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fermer"
            className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[0.06]"
          >
            <X size={22} />
          </button>
          <DialogTitle className="flex items-center gap-2 font-display text-[1.05rem] font-bold tracking-tight">
            {slotCfg && <slotCfg.icon size={18} className={slotCfg.textClass} />}
            <span>{slotCfg?.label ?? "Repas"}</span>
          </DialogTitle>
        </div>

        {/* Body */}
        <div data-enter-chain className="flex-1 space-y-6 overflow-y-auto px-5 pt-3 pb-6">
          {isRestaurant ? (
            <HeroInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nom du resto"
              enterKeyHint="next"
              onKeyDown={(e) => handleEnter(e)}
              aria-label="Nom du resto"
            />
          ) : (
            <div>
              <div className="flex items-end gap-2">
                <HeroInput
                  ref={draftRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={dishes.length === 0 ? "Qu'est-ce qu'on mange ?" : "Un autre plat ?"}
                  enterKeyHint="enter"
                  autoFocus={open && dishes.length === 0}
                  aria-label="Ajouter un plat"
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                    e.preventDefault();
                    if (!addDishFromDraft() && dishes.length > 0) void handleSave();
                  }}
                />
                {draft.trim() && (
                  <motion.button
                    type="button"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={addDishFromDraft}
                    aria-label="Ajouter ce plat"
                    className="pressable mb-1.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Plus size={20} />
                  </motion.button>
                )}
              </div>
              {dishes.length > 0 && (
                <div className="mt-4 space-y-2">
                  <AnimatePresence initial={false}>
                    {dishes.map((dish) => (
                      <DishRow
                        key={dish.id}
                        dish={dish}
                        expanded={expandedDish === dish.id}
                        onToggle={() => setExpandedDish((prev) => (prev === dish.id ? null : dish.id))}
                        onUpdate={(patch) => updateDish(dish.id, patch)}
                        onRemove={() => removeDish(dish.id)}
                        onAddIngredient={() => addIngredient(dish.id)}
                        onUpdateIngredient={(ingId, field, value) => updateIngredient(dish.id, ingId, field, value)}
                        onRemoveIngredient={(ingId) => removeIngredient(dish.id, ingId)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          <PropertyChips items={chips} />

          {category !== "home" && (
            <div className="flex items-center gap-3 rounded-2xl border border-input bg-card px-4 focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/12">
              <Link2 size={17} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Lien (site, Maps, réservation)"
                aria-label="Lien"
                enterKeyHint="next"
                onKeyDown={(e) => handleEnter(e)}
                className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}

          {noteOpen || isRestaurant ? (
            <div className="space-y-2">
              {!isRestaurant && (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Une précision…"
                  aria-label="Précision"
                  enterKeyHint="next"
                  onKeyDown={(e) => handleEnter(e)}
                />
              )}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isRestaurant ? "Horaire, n° de réservation…" : "Allergies, idées de courses…"}
                aria-label={isRestaurant ? "Réservation et notes" : "Allergies et courses"}
                rows={3}
                className="w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/12"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="pressable flex h-11 items-center gap-2 rounded-full px-1 text-[0.95rem] font-medium text-muted-foreground hover:text-foreground"
            >
              <NotebookPen size={16} aria-hidden="true" />
              Ajouter une note
            </button>
          )}

          {errorMsg && <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorMsg}</p>}
        </div>

        <FormFooter label="Enregistrer" onClick={handleSave} loading={saving} />
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
  onAddIngredient: () => string;
  onUpdateIngredient: (id: string, field: "name" | "quantity", value: string) => void;
  onRemoveIngredient: (id: string) => void;
}) {
  const courseCfg = COURSE_BY_ID[dish.course];
  const [focusIng, setFocusIng] = useState<string | null>(null);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl bg-secondary overflow-hidden"
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-secondary transition-colors min-w-0"
        >
          <courseCfg.icon size={16} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-[0.95rem] font-semibold text-foreground">
            {dish.name || courseCfg.label}
          </span>
          {dish.name && <span className="shrink-0 text-xs text-muted-foreground">{courseCfg.label}</span>}
          <span className="flex-1" />
          <ChevronDown
            size={14}
            className={cn(
              "text-muted-foreground transition-transform shrink-0",
              expanded && "rotate-180"
            )}
          />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="px-3 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
            className="overflow-hidden border-t border-border"
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
                        "pressable flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors",
                        sel
                          ? "bg-foreground text-background"
                          : "bg-card text-foreground hover:bg-foreground/[0.06]"
                      )}
                    >
                      <c.icon size={14} />
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
                enterKeyHint="next"
                onKeyDown={(e) => handleEnter(e)}
                aria-label="Nom du plat"
              />

              {/* Ingredients */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground px-1">
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
                        className="h-9 text-sm"
                        autoFocus={focusIng === ing.id}
                        enterKeyHint="next"
                        onKeyDown={(e) => handleEnter(e)}
                      />
                      <Input
                        value={ing.quantity}
                        onChange={(e) =>
                          onUpdateIngredient(ing.id, "quantity", e.target.value)
                        }
                        placeholder="500g"
                        className="h-9 text-sm"
                        enterKeyHint="next"
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                          e.preventDefault();
                          if (ing.name.trim()) setFocusIng(onAddIngredient());
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveIngredient(ing.id)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label="Retirer l'ingrédient"
                      >
                        <Trash2 size={12} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() => setFocusIng(onAddIngredient())}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-foreground/20 hover:text-foreground/85 transition-colors"
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
