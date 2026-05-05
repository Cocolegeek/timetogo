"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/layout/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tripSchema, type TripFormValues } from "@/lib/budget/schemas";
import { useTrips } from "@/hooks/useTrip";

const PARTICIPANT_COLORS = [
  "#6366f1", "#7c3aed", "#0ea5e9", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#14b8a6",
];

const EMOJIS = ["✈️", "🏖️", "🏔️", "🗺️", "🌍", "🎒", "🏕️", "🚢"];
const CURRENCIES = ["EUR", "USD", "GBP", "JPY", "CHF", "CAD"];

// Participant without ID — IDs are assigned by the DB
type ParticipantInput = { name: string; color: string };

export function TripWizard() {
  const router = useRouter();
  const { createTrip } = useTrips();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [participants, setParticipants] = useState<ParticipantInput[]>([]);

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
    try {
      const id = await createTrip({
        name: data.name,
        destination: data.destination,
        emoji: data.emoji,
        currency: data.currency,
        startDate: data.startDate,
        endDate: data.endDate,
        totalBudget: data.totalBudget,
        participants,
      });
      router.push(`/trips/${id}/budget`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-6">
      {/* Emoji + Name */}
      <GlassCard>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Emoji du voyage</Label>
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setValue("emoji", e)}
                  className={`w-10 h-10 rounded-xl text-xl transition-all ${
                    selectedEmoji === e
                      ? "bg-indigo-500/20 ring-2 ring-indigo-500/50 scale-110"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Nom du voyage</Label>
            <Input
              {...register("name")}
              placeholder="Road trip en Italie"
              className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/50"
            />
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Destination</Label>
            <Input
              {...register("destination")}
              placeholder="Rome, Italie"
              className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/50"
            />
            {errors.destination && (
              <p className="text-xs text-red-400">{errors.destination.message}</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Dates */}
      <GlassCard>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Départ</Label>
            <Input
              {...register("startDate")}
              type="date"
              className="bg-white/8 border-white/10 text-slate-100 focus-visible:ring-indigo-500/50 [color-scheme:dark]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Retour</Label>
            <Input
              {...register("endDate")}
              type="date"
              className="bg-white/8 border-white/10 text-slate-100 focus-visible:ring-indigo-500/50 [color-scheme:dark]"
            />
          </div>
        </div>
      </GlassCard>

      {/* Currency */}
      <GlassCard>
        <div className="space-y-2">
          <Label className="text-slate-300 text-xs">Devise principale</Label>
          <div className="flex gap-2 flex-wrap">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setValue("currency", c)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  selectedCurrency === c
                    ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/50"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Participants */}
      <GlassCard>
        <div className="space-y-3">
          <Label className="text-slate-300 text-xs">Participants</Label>

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
              className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/50"
            />
            <Button
              type="button"
              onClick={addParticipant}
              className="shrink-0 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30"
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
      </GlassCard>

      <Button
        type="submit"
        disabled={isSubmitting || participants.length === 0}
        className="w-full gradient-primary text-white border-0 py-6 text-base font-semibold disabled:opacity-40"
      >
        {isSubmitting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          "Créer le voyage 🚀"
        )}
      </Button>
    </form>
  );
}
