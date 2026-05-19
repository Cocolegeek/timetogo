"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPickerSheet } from "@/components/shared/LocationPickerSheet";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { tripSchema, type TripFormValues } from "@/lib/budget/schemas";
import { useTrips } from "@/hooks/useTrip";
import { cn } from "@/lib/utils";

const PARTICIPANT_COLORS = [
  "#6366f1", "#7c3aed", "#0ea5e9", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#14b8a6",
];

const EMOJIS = ["✈️", "🏖️", "🏔️", "🗺️", "🌍", "🎒", "🏕️", "🚢"];
const CURRENCIES = ["EUR", "USD", "GBP", "JPY", "CHF", "CAD"];

type ParticipantInput = { name: string; color: string };
type NavTab = "Infos" | "Participants";

export function TripWizard() {
  const router = useRouter();
  const { createTrip } = useTrips();
  const [activeTab, setActiveTab] = useState<NavTab>("Infos");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [participants, setParticipants] = useState<ParticipantInput[]>([]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [budgetStr, setBudgetStr] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TripFormValues, unknown, TripFormValues>({
    resolver: zodResolver(tripSchema) as never,
    defaultValues: {
      emoji: "✈️",
      currency: "EUR",
      participants: [],
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    },
  });

  const selectedEmoji = watch("emoji");
  const selectedCurrency = watch("currency");
  const destination = watch("destination") ?? "";
  const startDate = watch("startDate");
  const endDate = watch("endDate");

  const addParticipant = () => {
    const name = newParticipantName.trim();
    if (!name) return;
    const color = PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length];
    const updated = [...participants, { name, color }];
    setParticipants(updated);
    setValue("participants", updated.map((p, i) => ({ id: String(i), ...p })));
    setNewParticipantName("");
  };

  const removeParticipant = (index: number) => {
    const updated = participants.filter((_, i) => i !== index);
    setParticipants(updated);
    setValue("participants", updated.map((p, i) => ({ id: String(i), ...p })));
  };

  const onSubmit = async (data: TripFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const parsedBudget = budgetEnabled
        ? Number(budgetStr.replace(",", "."))
        : undefined;
      const id = await createTrip({
        type: "trip",
        name: data.name,
        destination: data.destination,
        emoji: data.emoji,
        currency: data.currency,
        startDate: data.startDate,
        endDate: data.endDate,
        totalBudget:
          parsedBudget && parsedBudget > 0 ? parsedBudget : undefined,
        participants,
      });
      router.push(`/trips/${id}/budget`);
    } catch (err) {
      console.error("[trip-create]", err);
      setSubmitError(`Impossible de créer le voyage. ${formatError(err)}`);
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
    <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1 bg-foreground/4 p-1 rounded-xl border border-foreground/8">
        {(["Infos", "Participants"] as NavTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab
                ? "bg-section-soft text-section-soft ring-1 ring-section"
                : "text-slate-400 hover:text-slate-200"
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
            <Label className="text-slate-300 text-sm font-medium">Nom du voyage</Label>
            <div className="flex items-stretch gap-2 bg-foreground/8 border border-foreground/10 rounded-lg focus-within:ring-3 focus-within:ring-section transition-all overflow-hidden">
              <button
                type="button"
                onClick={() => setEmojiPickerOpen((v) => !v)}
                className="w-12 h-11 flex items-center justify-center text-2xl hover:bg-foreground/8 active:bg-foreground/12 transition-colors shrink-0"
                aria-label="Changer l'emoji"
              >
                {selectedEmoji}
              </button>
              <input
                {...register("name")}
                placeholder="Road trip en Italie"
                className="flex-1 bg-transparent border-0 outline-none text-base text-slate-100 placeholder:text-slate-500 pr-3"
              />
            </div>
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
                            ? "bg-section-soft ring-1 ring-section"
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
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm font-medium">Destination</Label>
            <LocationPickerSheet
              value={destination}
              onChange={(v) =>
                setValue("destination", v, { shouldValidate: true, shouldDirty: true })
              }
              placeholder="Rome, Italie"
              className="bg-foreground/8 border-foreground/10"
            />
            {errors.destination && (
              <p className="text-xs text-red-400">{errors.destination.message}</p>
            )}
          </div>

          {/* Dates */}
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setValue("startDate", start);
              setValue("endDate", end);
            }}
          />

          {/* Currency */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm font-medium">Devise principale</Label>
            <div className="flex gap-2 flex-wrap">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("currency", c)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-sm font-medium transition-all",
                    selectedCurrency === c
                      ? "bg-section-soft text-section-soft ring-1 ring-section"
                      : "bg-foreground/5 text-slate-400 hover:bg-foreground/10 hover:text-slate-300"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Budget prévisionnel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300 text-sm font-medium">
                Budget prévisionnel{" "}
                <span className="text-slate-500 font-normal">(optionnel)</span>
              </Label>
              <button
                type="button"
                onClick={() => setBudgetEnabled((v) => !v)}
                className={cn(
                  "relative w-10 h-6 rounded-full transition-colors",
                  budgetEnabled ? "bg-section" : "bg-foreground/10"
                )}
                aria-label="Activer le budget prévisionnel"
              >
                <span
                  className={cn(
                    "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                    budgetEnabled ? "translate-x-[18px]" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
            <AnimatePresence initial={false}>
              {budgetEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={budgetStr}
                      onChange={(e) =>
                        setBudgetStr(e.target.value.replace(/[^0-9.,]/g, ""))
                      }
                      onFocus={(e) => e.target.select()}
                      placeholder="ex: 1500"
                      className="bg-foreground/8 border-foreground/10 text-slate-100 placeholder:text-slate-500 pr-14 tabular-nums"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
                      {selectedCurrency}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Sert à suivre tes dépenses avec une barre de progression.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Guide vers l'onglet suivant */}
          <button
            type="button"
            onClick={() => setActiveTab("Participants")}
            className="w-full py-2.5 text-sm text-slate-400 hover:text-slate-200 border border-foreground/8 rounded-xl hover:bg-foreground/4 transition-all"
          >
            Ajouter des participants →
          </button>
        </div>
      )}

      {/* ── Participants ── */}
      {activeTab === "Participants" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addParticipant();
                }
              }}
              placeholder="Prénom du participant"
              className="bg-foreground/8 border-foreground/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-section"
            />
            <Button
              type="button"
              onClick={addParticipant}
              className="shrink-0 bg-section-soft hover:bg-section-medium text-section-soft border border-section"
            >
              <Plus size={16} />
            </Button>
          </div>

          <AnimatePresence>
            {participants.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 py-1"
              >
                <div
                  className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm text-slate-300 flex-1">{p.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-500 hover:text-red-400"
                  onClick={() => removeParticipant(i)}
                >
                  <X size={14} />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>

          {participants.length === 0 && (
            <p className="text-xs text-slate-600">
              Ajoute au moins un participant (toi et tes compagnons de voyage).
            </p>
          )}
        </div>
      )}

      {submitError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {submitError}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || participants.length === 0}
        className="w-full gradient-primary text-white border-0 py-6 text-base font-semibold disabled:opacity-40"
      >
        {isSubmitting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          "On embarque 🚀"
        )}
      </Button>
    </form>
  );
}
