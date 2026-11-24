"use client";

import { use, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, m as motion } from "framer-motion";
import { ArrowUp, Check, ChevronDown, Trash2, UserRound } from "lucide-react";
import { Burst } from "@/components/motion/Burst";
import { PageHeader } from "@/components/layout/PageHeader";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { ParticipantPicker } from "@/components/shared/ParticipantPicker";
import { ParticipantStack } from "@/components/shared/ParticipantStack";
import { Spinner } from "@/components/shared/Spinner";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useTrip } from "@/hooks/useTrip";
import { useChecklist } from "@/hooks/useChecklist";
import { useQuickAdd } from "@/hooks/useQuickAdd";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";
import { haptic } from "@/lib/haptics";
import { EASE_OUT, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { ChecklistItem, ChecklistList, Participant } from "@/types";

const LISTS: { value: ChecklistList; label: string; placeholder: string; empty: string; suggestions: string[] }[] = [
  {
    value: "bring",
    label: "À apporter",
    placeholder: "Qui ramène quoi ? (enceinte, raclette…)",
    empty: "Ce que la bande doit emporter. Chacun dit ce qu'il prend, fini les trois enceintes et zéro tire-bouchon.",
    suggestions: ["Enceinte", "Jeux de société", "Trousse de secours", "Chargeurs", "Crème solaire", "Tire-bouchon"],
  },
  {
    value: "todo",
    label: "À faire",
    placeholder: "Une chose à faire avant le départ…",
    empty: "Ce qu'il faut régler avant ou pendant le voyage, et qui s'en occupe.",
    suggestions: ["Réserver le logement", "Louer la voiture", "Acheter les billets", "Faire les courses", "Assurance voyage"],
  },
];

export default function ListsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const { trip } = useTrip(tripId);
  const { items: allItems, loading, addItem, updateItem, deleteItem } = useChecklist(tripId);
  const { pending, remove } = useUndoableDelete(deleteItem);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const deepItem = searchParams.get("item");
  const [list, setList] = useState<ChecklistList>(() => {
    const target = allItems.find((i) => i.id === deepItem);
    return target?.list ?? (searchParams.get("list") === "todo" ? "todo" : "bring");
  });
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(deepItem);
  const [showDone, setShowDone] = useState(false);

  useQuickAdd((kind) => {
    if (kind === "item") inputRef.current?.focus();
  });

  const items = useMemo(() => allItems.filter((i) => !pending.has(i.id)), [allItems, pending]);
  const participants = trip?.participants ?? [];
  const myId = trip?.myParticipantId ?? null;
  const cfg = LISTS.find((l) => l.value === list)!;
  const inList = items.filter((i) => i.list === list);
  const open = inList.filter((i) => !i.done);
  const done = inList.filter((i) => i.done);
  const editing = items.find((i) => i.id === editingId) ?? null;
  const remaining = (l: ChecklistList) => items.filter((i) => i.list === l && !i.done).length;

  const add = async (title: string) => {
    const t = title.trim();
    if (!t) return;
    haptic("light");
    setDraft("");
    try {
      await addItem({ list, title: t });
    } catch {
      setDraft(t);
      toast({ message: "Impossible d'ajouter. Réessaie.", tone: "error" });
    }
  };

  const toggleDone = (item: ChecklistItem) => {
    haptic(item.done ? "light" : "success");
    void updateItem(item.id, { done: !item.done });
  };

  if (!trip) return <Spinner />;

  return (
    <div className="space-y-5 pt-1">
      <PageHeader eyebrow={trip.name} title="Listes" />

      <div
        className="sticky z-20 -mx-4 bg-background/85 px-4 py-2 backdrop-blur-xl backdrop-saturate-150"
        style={{ top: "calc(env(safe-area-inset-top) + 3.5rem)" }}
      >
        <SegmentedControl
          id="lists"
          value={list}
          onChange={(v) => {
            setList(v);
            setShowDone(false);
          }}
          options={LISTS.map((l) => ({ value: l.value, label: l.label, badge: remaining(l.value) }))}
        />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void add(draft);
        }}
        className="flex h-14 items-center gap-2 rounded-full bg-card pr-2 pl-5 shadow-card focus-within:ring-2 focus-within:ring-ring"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={cfg.placeholder}
          aria-label={`Ajouter à « ${cfg.label} »`}
          autoFocus={searchParams.get("new") === "item"}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        <AnimatePresence>
          {draft.trim() && (
            <motion.button
              type="submit"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={spring}
              aria-label="Ajouter"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <ArrowUp size={19} strokeWidth={2.4} />
            </motion.button>
          )}
        </AnimatePresence>
      </form>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={list}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="space-y-5"
        >
          {loading && items.length === 0 ? null : open.length === 0 && done.length === 0 ? (
            <section className="rounded-[1.5rem] border border-dashed border-foreground/20 px-5 py-7 text-center">
              <p className="text-[0.95rem] text-muted-foreground">{cfg.empty}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {cfg.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void add(s)}
                    className="pressable rounded-full bg-secondary px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-foreground/[0.08]"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <>
              {open.length > 0 ? (
                <ul className="overflow-hidden rounded-[1.5rem] bg-card shadow-card">
                  <AnimatePresence initial={false}>
                    {open.map((item, i) => (
                      <Row
                        key={item.id}
                        item={item}
                        first={i === 0}
                        participants={participants}
                        myId={myId}
                        onToggle={() => toggleDone(item)}
                        onOpen={() => setEditingId(item.id)}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              ) : (
                <p className="flex items-center justify-center gap-2 py-4 text-[0.95rem] font-semibold text-emerald-400">
                  <Check size={18} strokeWidth={2.6} />
                  Tout est fait
                </p>
              )}

              {done.length > 0 && (
                <section>
                  <button
                    type="button"
                    onClick={() => setShowDone((v) => !v)}
                    aria-expanded={showDone}
                    className="flex w-full items-center justify-between px-1 py-1 text-sm font-semibold text-muted-foreground"
                  >
                    Fait · {done.length}
                    <ChevronDown size={17} className={cn("transition-transform", showDone && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {showDone && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: EASE_OUT }}
                        className="mt-2 overflow-hidden rounded-[1.5rem] bg-card shadow-card"
                      >
                        {done.map((item, i) => (
                          <Row
                            key={item.id}
                            item={item}
                            first={i === 0}
                            participants={participants}
                            myId={myId}
                            onToggle={() => toggleDone(item)}
                            onOpen={() => setEditingId(item.id)}
                          />
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </section>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <ItemSheet
        item={editing}
        participants={participants}
        myId={myId}
        onClose={() => setEditingId(null)}
        onSave={async (patch) => {
          if (!editing) return;
          await updateItem(editing.id, patch);
          toast({ message: "Liste mise à jour", tone: "success" });
        }}
        onDelete={() => {
          if (!editing) return;
          remove(editing.id, "Élément supprimé");
          setEditingId(null);
        }}
      />
    </div>
  );
}

function Row({
  item,
  first,
  participants,
  myId,
  onToggle,
  onOpen,
}: {
  item: ChecklistItem;
  first: boolean;
  participants: Participant[];
  myId: string | null;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const who = participants.filter((p) => item.assigneeIds.includes(p.id));
  const mine = !!myId && item.assigneeIds.includes(myId);
  const [celebrate, setCelebrate] = useState(false);
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: EASE_OUT }}
      className={cn(!first && "border-t border-border")}
    >
      <div className="flex min-h-14 items-center gap-1 pr-3">
        <button
          type="button"
          onClick={() => {
            if (!item.done) setCelebrate(true);
            onToggle();
          }}
          role="checkbox"
          aria-checked={item.done}
          aria-label={item.done ? `Décocher ${item.title}` : `Cocher ${item.title}`}
          className="flex size-14 shrink-0 items-center justify-center outline-none"
        >
          <motion.span
            animate={{ scale: item.done ? [1, 1.18, 1] : 1 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "relative flex size-[26px] items-center justify-center rounded-full border-2 transition-colors",
              item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-foreground/25"
            )}
          >
            {item.done && <Check size={15} strokeWidth={3} className={cn(celebrate && "animate-pop")} />}
            {item.done && celebrate && <Burst />}
          </motion.span>
        </button>
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left outline-none">
          <span className="min-w-0 flex-1">
            <span className={cn("block text-[0.98rem] font-medium", item.done && "text-muted-foreground line-through decoration-2")}>
              {item.title}
            </span>
            {item.note && <span className="block truncate text-sm text-muted-foreground">{item.note}</span>}
          </span>
          {who.length > 0 ? (
            <span className="flex shrink-0 items-center gap-1.5">
              {mine && who.length === 1 ? (
                <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">Toi</span>
              ) : (
                <ParticipantStack participants={who} size="sm" max={3} showLabel={false} />
              )}
            </span>
          ) : (
            !item.done && (
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-foreground/25 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                <UserRound size={13} />
                Qui ?
              </span>
            )
          )}
        </button>
      </div>
    </motion.li>
  );
}

function ItemSheet({
  item,
  participants,
  myId,
  onClose,
  onSave,
  onDelete,
}: {
  item: ChecklistItem | null;
  participants: Participant[];
  myId: string | null;
  onClose: () => void;
  onSave: (patch: Partial<Pick<ChecklistItem, "title" | "note" | "assigneeIds" | "list">>) => Promise<void>;
  onDelete: () => void;
}) {
  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="flex flex-col overflow-hidden p-0" style={{ maxHeight: "88dvh" }}>
        {item && <ItemForm key={item.id} item={item} participants={participants} myId={myId} onClose={onClose} onSave={onSave} onDelete={onDelete} />}
      </SheetContent>
    </Sheet>
  );
}

function ItemForm({
  item,
  participants,
  myId,
  onClose,
  onSave,
  onDelete,
}: {
  item: ChecklistItem;
  participants: Participant[];
  myId: string | null;
  onClose: () => void;
  onSave: (patch: Partial<Pick<ChecklistItem, "title" | "note" | "assigneeIds" | "list">>) => Promise<void>;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [note, setNote] = useState(item.note ?? "");
  const [who, setWho] = useState<string[]>(item.assigneeIds);
  const [list, setList] = useState<ChecklistList>(item.list);
  const [saving, setSaving] = useState(false);
  const toggle = (id: string) => setWho((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  const iTakeIt = !!myId && who.length === 1 && who[0] === myId;

  return (
    <>
      <div className="shrink-0 px-5 pt-9 pb-2">
        <SheetTitle className="sr-only">Modifier « {item.title} »</SheetTitle>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Intitulé"
          className="w-full bg-transparent font-display text-[1.6rem] leading-tight font-bold tracking-tight outline-none"
        />
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-5 pt-3 pb-4">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Qui s&apos;en charge ?</h3>
            {myId && (
              <button
                type="button"
                onClick={() => setWho(iTakeIt ? [] : [myId])}
                className={cn(
                  "pressable rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                  iTakeIt ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-foreground/[0.08]"
                )}
              >
                Je m&apos;en charge
              </button>
            )}
          </div>
          <ParticipantPicker participants={participants} selected={who} onToggle={toggle} />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Liste</h3>
          <SegmentedControl
            id="item-list"
            value={list}
            onChange={setList}
            options={LISTS.map((l) => ({ value: l.value, label: l.label }))}
          />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Note</h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Quantité, lien, détail…"
            rows={2}
            className="w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/12"
          />
        </section>

        <button
          type="button"
          onClick={onDelete}
          className="pressable flex h-12 w-full items-center justify-center gap-2 rounded-full bg-red-500/10 text-[0.95rem] font-semibold text-red-400 transition-colors hover:bg-red-500/15"
        >
          <Trash2 size={17} />
          Supprimer
        </button>
      </div>
      <div className="flex shrink-0 gap-2 border-t border-border px-5 pt-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>
        <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
          Annuler
        </Button>
        <Button
          size="lg"
          className="flex-[2]"
          disabled={saving || !title.trim()}
          onClick={async () => {
            setSaving(true);
            await onSave({ title: title.trim(), note: note.trim() || null, assigneeIds: who, list });
            setSaving(false);
            onClose();
          }}
        >
          Enregistrer
        </Button>
      </div>
    </>
  );
}
