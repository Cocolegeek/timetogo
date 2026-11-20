"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Infinity, CalendarDays, CalendarRange } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { groupSchema, type GroupFormValues, type GroupDateMode } from "@/lib/budget/schemas";
import { useTrips } from "@/hooks/useTrip";
import { cn } from "@/lib/utils";

const PARTICIPANT_COLORS = [
  "#6366f1", "#7c3aed", "#0ea5e9", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#14b8a6",
];

const EMOJIS = ["💰", "🎂", "🎉", "🍻", "🏠", "🎁", "🤝", "📚"];
const CURRENCIES = ["EUR", "USD", "GBP", "JPY", "CHF", "CAD"];

type ParticipantInput = { name: string; color: string };
type NavTab = "Infos" | "Participants";

export function GroupWizard() {
  const router = useRouter();
  const { createTrip } = useTrips();
  const [activeTab, setActiveTab] = useState<NavTab>("Infos");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [participants, setParticipants] = useState<ParticipantInput[]>([]);
  const { profile } = useProfile();
  const creatorName = profile?.name?.split(" ")[0] ?? null;

  // The creator is always part of the trip: pre-fill them as first participant.
  useEffect(() => {
    if (!creatorName) return;
    setParticipants((list) => (list.length === 0 ? [{ name: creatorName, color: PARTICIPANT_COLORS[0] }] : list));
  }, [creatorName]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GroupFormValues, unknown, GroupFormValues>({
    resolver: zodResolver(groupSchema) as never,
    defaultValues: {
      emoji: "💰",
      currency: "EUR",
      participants: [],
      dateMode: "permanent",
    },
  });

  const selectedEmoji = watch("emoji");
  const selectedCurrency = watch("currency");
  const dateMode = watch("dateMode");
  const startDate = watch("startDate");
  const endDate = watch("endDate");

  const addParticipant = () => {
    const name = newParticipantName.trim();
    if (!name) return;
    const color =
      PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length];
    const updated = [...participants, { name, color }];
    setParticipants(updated);
    setValue("participants", updated.map((p, i) => ({ id: String(i), ...p })));
    setNewParticipantName("");
  };

  const removeParticipant = (i: number) => {
    const updated = participants.filter((_, idx) => idx !== i);
    setParticipants(updated);
    setValue("participants", updated.map((p, idx) => ({ id: String(idx), ...p })));
  };

  const onSubmit = async (data: GroupFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const resolvedStart = data.dateMode === "permanent" ? undefined : data.startDate;
      const resolvedEnd = data.dateMode === "date_fixe" ? data.startDate : data.dateMode === "creneau" ? data.endDate : undefined;
      const id = await createTrip({
        type: "group",
        name: data.name,
        emoji: data.emoji,
        currency: data.currency,
        totalBudget: data.totalBudget,
        startDate: resolvedStart,
        endDate: resolvedEnd,
        participants,
      });
      router.push(`/trips/${id}/budget`);
    } catch (err) {
      console.error("[group-create]", err);
      setSubmitError(`Impossible de créer le budget. ${formatError(err)}`);
      setIsSubmitting(false);
    }
  };

  function formatError(err: unknown): string {
    if (!err) return "Erreur inconnue.";
    if (typeof err === "string") return err;
    if (typeof err === "object") {
      const e = err as { message?: string; details?: string; hint?: string; code?: string };
      const parts = [e.message, e.details, e.hint, e.code ? `[${e.code}]` : null].filter(Boolean);
      if (parts.length > 0) return parts.join(" — ");
      try { return JSON.stringify(err); } catch { return String(err); }
    }
    return String(err);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Tab navigation */}
      <div role="tablist" className="flex h-11 gap-1 rounded-full bg-foreground/[0.06] p-1">
        {(["Infos", "Participants"] as NavTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 rounded-full text-sm font-semibold transition-all",
              activeTab === tab
                ? "bg-card text-foreground shadow-card dark:bg-foreground/[0.12]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
            {tab === "Participants" && participants.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({participants.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Infos ── */}
      {activeTab === "Infos" && (
        <div className="space-y-4">
          {/* Name + emoji */}
          <div className="space-y-1.5">
            <Label className="px-1 text-sm font-semibold text-foreground">Nom du budget</Label>
            <div className="flex items-stretch gap-2 h-12 rounded-2xl border border-input bg-card transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/12 overflow-hidden">
              <button
                type="button"
                onClick={() => setEmojiPickerOpen((v) => !v)}
                className="w-12 h-full flex items-center justify-center text-2xl hover:bg-foreground/8 active:bg-foreground/12 transition-colors shrink-0"
              >
                {selectedEmoji}
              </button>
              <input
                {...register("name")}
                placeholder="Anniversaire de Léa"
                className="flex-1 bg-transparent border-0 outline-none text-base text-slate-100 placeholder:text-slate-500 pr-3"
              />
            </div>
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name.message}</p>
            )}
            <AnimatePresence initial={false}>
              {emojiPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-1 pt-2 flex-wrap">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => {
                          setValue("emoji", e);
                          setEmojiPickerOpen(false);
                        }}
                        className={cn(
                          "w-10 h-10 rounded-lg text-xl transition-all",
                          selectedEmoji === e
                            ? "bg-primary/12 ring-2 ring-primary"
                            : "hover:bg-foreground/8 active:bg-foreground/12"
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label className="px-1 text-sm font-semibold text-foreground">Devise</Label>
            <div className="flex gap-2 flex-wrap">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("currency", c)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-sm font-medium transition-all active:scale-95",
                    selectedCurrency === c
                      ? "bg-primary/10 text-primary ring-1 ring-primary/40"
                      : "bg-foreground/5 text-slate-400 hover:bg-foreground/10"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Date mode */}
          <div className="space-y-2">
            <Label className="px-1 text-sm font-semibold text-foreground">Période</Label>
            <div className="flex gap-2">
              {(
                [
                  { mode: "permanent" as GroupDateMode, label: "Permanent", icon: Infinity },
                  { mode: "date_fixe" as GroupDateMode, label: "Date fixe", icon: CalendarDays },
                  { mode: "creneau" as GroupDateMode, label: "Créneau", icon: CalendarRange },
                ] as const
              ).map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setValue("dateMode", mode);
                    setValue("startDate", undefined);
                    setValue("endDate", undefined);
                  }}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-medium transition-all active:scale-95",
                    dateMode === mode
                      ? "bg-primary/10 text-primary ring-1 ring-primary/40"
                      : "bg-foreground/5 text-slate-400 hover:bg-foreground/10"
                  )}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {dateMode !== "permanent" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="pt-1">
                  {dateMode === "creneau" ? (
                    <>
                      <DateRangePicker
                        startDate={startDate ?? ""}
                        endDate={endDate ?? ""}
                        onChange={(start, end) => {
                          setValue("startDate", start || undefined);
                          setValue("endDate", end || undefined);
                        }}
                      />
                      {(errors.startDate || errors.endDate) && (
                        <p className="text-xs text-red-400 mt-1">
                          {errors.startDate?.message ?? errors.endDate?.message}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Date</Label>
                      <input
                        type="date"
                        value={startDate ?? ""}
                        onChange={(e) => setValue("startDate", e.target.value || undefined)}
                        className="w-full border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-section border-input bg-card rounded-2xl h-12 placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/12 tabular"
                      />
                      {errors.startDate && (
                        <p className="text-xs text-red-400">{errors.startDate.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Guide vers l'onglet suivant */}
          <button
            type="button"
            onClick={() => setActiveTab("Participants")}
            className="pressable flex h-12 w-full items-center justify-center rounded-full bg-foreground/[0.06] text-sm font-semibold text-foreground transition-colors hover:bg-foreground/10"
          >
            Ajouter des participants →
          </button>
        </div>
      )}

      {/* ── Participants ── */}
      {activeTab === "Participants" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            {participants.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl bg-secondary px-3 py-2"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 truncate text-[0.95rem] font-medium">{p.name}</span>
                <button
                  type="button"
                  onClick={() => removeParticipant(i)}
                  aria-label={`Retirer ${p.name}`}
                  className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addParticipant();
                }
              }}
              placeholder="Embarquer quelqu'un"
              className="flex-1 border px-3 py-2 text-base outline-none focus:ring-section border-input bg-card rounded-2xl h-12 placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/12 tabular"
            />
            <Button
              type="button"
              onClick={addParticipant}
              disabled={!newParticipantName.trim()}
              className="shrink-0 bg-section-soft hover:bg-section-medium text-section-soft border border-section disabled:opacity-40"
            >
              <Plus size={16} />
            </Button>
          </div>
          {errors.participants && (
            <p className="text-xs text-red-400">{errors.participants.message as string}</p>
          )}
        </div>
      )}

      {submitError && (
        <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {submitError}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary text-primary-foreground border-0 h-12"
      >
        {isSubmitting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          "C'est parti"
        )}
      </Button>
    </form>
  );
}
