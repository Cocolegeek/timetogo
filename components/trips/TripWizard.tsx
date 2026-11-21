"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { m as motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPickerSheet } from "@/components/shared/LocationPickerSheet";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { tripSchema, type TripFormValues } from "@/lib/budget/schemas";
import { useTrips } from "@/hooks/useTrip";
import { cn } from "@/lib/utils";
import { PARTICIPANT_COLORS } from "@/lib/participant-colors";
import { FriendPicker } from "@/components/trips/FriendPicker";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { addFriendsToTrip, useFriends } from "@/hooks/useFriends";


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
  // « Ta bande »: ?with=<id> (from a friend's card) pre-selects that friend.
  const [friendIds, setFriendIds] = useState<string[]>(() => {
    const w = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("with") : null;
    return w ? [w] : [];
  });
  const { friends } = useFriends();
  const chosenFriends = friends.filter((f) => friendIds.includes(f.id));
  const toggleFriend = (id: string) => setFriendIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const { profile } = useProfile();
  const creatorName = profile?.name?.split(" ")[0] ?? null;

  // The creator is always part of the trip: pre-fill them as first participant.
  useEffect(() => {
    if (!creatorName) return;
    setParticipants((list) => (list.length === 0 ? [{ name: creatorName, color: PARTICIPANT_COLORS[0] }] : list));
  }, [creatorName]);
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
      await addFriendsToTrip(
        id,
        chosenFriends.map((f, i) => ({ id: f.id, color: PARTICIPANT_COLORS[(participants.length + i) % PARTICIPANT_COLORS.length] }))
      ).catch(() => 0);
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
            {tab === "Participants" && participants.length + chosenFriends.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({participants.length + chosenFriends.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Infos ── */}
      {activeTab === "Infos" && (
        <div className="space-y-4">
          {/* Name + emoji */}
          <div className="space-y-1.5">
            <Label className="px-1 text-sm font-semibold text-foreground">Nom du voyage</Label>
            <div className="flex items-stretch gap-2 h-12 rounded-2xl border border-input bg-card transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/12 overflow-hidden">
              <button
                type="button"
                onClick={() => setEmojiPickerOpen((v) => !v)}
                className="w-12 h-full flex items-center justify-center text-2xl hover:bg-foreground/[0.06] active:bg-foreground/10 transition-colors shrink-0"
                aria-label="Changer l'emoji"
              >
                {selectedEmoji}
              </button>
              <input
                {...register("name")}
                placeholder="Road trip en Italie"
                className="flex-1 bg-transparent border-0 outline-none text-base text-foreground placeholder:text-muted-foreground pr-3"
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
                            ? "bg-primary/12 ring-2 ring-primary"
                            : "hover:bg-foreground/[0.06] active:bg-foreground/10"
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
            <Label className="px-1 text-sm font-semibold text-foreground">Destination</Label>
            <LocationPickerSheet
              value={destination}
              onChange={(v) =>
                setValue("destination", v, { shouldValidate: true, shouldDirty: true })
              }
              placeholder="Rome, Italie"
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
            <Label className="px-1 text-sm font-semibold text-foreground">Devise principale</Label>
            <div className="flex gap-2 flex-wrap">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("currency", c)}
                  className={cn(
                    "pressable h-10 rounded-full px-4 text-sm font-semibold transition-colors",
                    selectedCurrency === c
                      ? "bg-foreground text-background"
                      : "bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.08]"
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
              <Label className="px-1 text-sm font-semibold text-foreground">
                Budget prévisionnel{" "}
                <span className="text-muted-foreground font-normal">(optionnel)</span>
              </Label>
              <button
                type="button"
                onClick={() => setBudgetEnabled((v) => !v)}
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                  budgetEnabled ? "bg-primary" : "bg-foreground/15"
                )}
                aria-label="Activer le budget prévisionnel"
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-card transition-transform duration-300 ease-(--ease-out)",
                    budgetEnabled ? "translate-x-5" : "translate-x-0"
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
                      className="pr-14 tabular-nums"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                      {selectedCurrency}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
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
            className="pressable flex h-12 w-full items-center justify-center rounded-full bg-foreground/[0.06] text-sm font-semibold text-foreground transition-colors hover:bg-foreground/[0.08]"
          >
            Ajouter des participants →
          </button>
        </div>
      )}

      {/* ── Participants ── */}
      {activeTab === "Participants" && (
        <div className="space-y-4">
          <FriendPicker selected={friendIds} onToggle={(f) => toggleFriend(f.id)} className="pb-2" />
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
              className="focus-visible:ring-primary/30"
            />
            <Button
              type="button"
              onClick={addParticipant}
              size="icon" className="size-12 shrink-0 rounded-2xl"
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
                className="flex items-center gap-3 overflow-hidden rounded-2xl bg-secondary px-3 py-2"
              >
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="flex-1 text-[0.95rem] font-medium text-foreground">{p.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-full text-muted-foreground hover:text-red-400"
                  onClick={() => removeParticipant(i)}
                >
                  <X size={16} />
                </Button>
              </motion.div>
            ))}
            {chosenFriends.map((f) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 overflow-hidden rounded-2xl bg-secondary px-3 py-2"
              >
                <UserAvatar src={f.avatar} name={f.name} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.95rem] font-medium text-foreground">{f.name?.split(" ")[0]}</span>
                  <span className="block text-xs text-muted-foreground">Ta bande · voyage ajouté chez lui</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Retirer ${f.name?.split(" ")[0] ?? ""}`}
                  className="size-9 rounded-full text-muted-foreground hover:text-red-400"
                  onClick={() => toggleFriend(f.id)}
                >
                  <X size={16} />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>

          {participants.length === 0 && (
            <p className="px-1 text-sm text-muted-foreground">
              Ajoute au moins un participant (toi et tes compagnons de voyage).
            </p>
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
        disabled={isSubmitting || participants.length + chosenFriends.length === 0}
        size="lg" className="w-full shadow-section disabled:shadow-none"
      >
        {isSubmitting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          "Créer le voyage"
        )}
      </Button>
    </form>
  );
}
