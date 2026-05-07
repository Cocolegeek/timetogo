"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LocationAutocomplete } from "@/components/shared/LocationAutocomplete";
import { cn } from "@/lib/utils";
import type { ItineraryItem, ItineraryType, Participant } from "@/types";

const TYPE_CONFIG: Record<
  ItineraryType,
  { label: string; color: string; bg: string }
> = {
  transport:     { label: "Transport",   color: "text-sky-400",     bg: "bg-sky-400/10"     },
  accommodation: { label: "Hébergement", color: "text-violet-400",  bg: "bg-violet-400/10"  },
  activity:      { label: "Activité",    color: "text-emerald-400", bg: "bg-emerald-400/10" },
  food:          { label: "Resto",       color: "text-amber-400",   bg: "bg-amber-400/10"   },
  other:         { label: "Autre",       color: "text-slate-400",   bg: "bg-slate-400/10"   },
};

const QUICK_DURATIONS: { label: string; minutes: number }[] = [
  { label: "30 min", minutes: 30 },
  { label: "1 h", minutes: 60 },
  { label: "1 h 30", minutes: 90 },
  { label: "2 h", minutes: 120 },
  { label: "3 h", minutes: 180 },
  { label: "Journée", minutes: 480 },
];

export interface ItineraryFormValues {
  title: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
  type: ItineraryType;
  durationMinutes?: number;
  participantIds: string[];
}

interface ItineraryItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: Participant[];
  defaultDate: string;
  /** Provide an item to enter edit mode. */
  initialValues?: ItineraryItem;
  onSubmit: (values: ItineraryFormValues) => Promise<void>;
}

export function ItineraryItemForm({
  open,
  onOpenChange,
  participants,
  defaultDate,
  initialValues,
  onSubmit,
}: ItineraryItemFormProps) {
  const isEdit = !!initialValues;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ItineraryType>("activity");
  const [durationH, setDurationH] = useState("");
  const [durationM, setDurationM] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hydrate when opened
  useEffect(() => {
    if (!open) return;
    if (initialValues) {
      setTitle(initialValues.title);
      setDate(initialValues.date);
      setTime(initialValues.time ?? "");
      setLocation(initialValues.location ?? "");
      setDescription(initialValues.description ?? "");
      setType(initialValues.type);
      const dh = initialValues.durationMinutes
        ? Math.floor(initialValues.durationMinutes / 60)
        : 0;
      const dm = initialValues.durationMinutes
        ? initialValues.durationMinutes % 60
        : 0;
      setDurationH(dh ? String(dh) : "");
      setDurationM(dm ? String(dm) : "");
      setSelectedParticipantIds(initialValues.participantIds ?? []);
    } else {
      setTitle("");
      setDate(defaultDate);
      setTime("");
      setLocation("");
      setDescription("");
      setType("activity");
      setDurationH("");
      setDurationM("");
      setSelectedParticipantIds([]);
    }
    setErrorMsg(null);
  }, [open, initialValues, defaultDate]);

  const totalMinutes =
    (Number(durationH) || 0) * 60 + (Number(durationM) || 0);

  const setQuickDuration = (mins: number) => {
    setDurationH(String(Math.floor(mins / 60)));
    setDurationM(String(mins % 60));
  };

  const toggleParticipant = (id: string) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || !date) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSubmit({
        title: title.trim(),
        date,
        time: time || undefined,
        location: location || undefined,
        description: description || undefined,
        type,
        durationMinutes: totalMinutes > 0 ? totalMinutes : undefined,
        participantIds: selectedParticipantIds,
      });
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur lors de l'enregistrement";
      setErrorMsg(msg);
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
          <DialogTitle className="text-slate-100 text-xl">
            {isEdit ? "Modifier l'étape" : "Nouvelle étape"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm font-medium">Titre</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Vol Paris → Rome"
              className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500"
              autoFocus={!isEdit}
            />
          </div>

          {/* Date + time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white/8 border-white/10 text-slate-100 [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">Heure</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-white/8 border-white/10 text-slate-100 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm font-medium">Type</Label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(TYPE_CONFIG) as ItineraryType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-sm font-medium transition-all active:scale-95",
                    type === t
                      ? cn(
                          TYPE_CONFIG[t].bg,
                          TYPE_CONFIG[t].color,
                          "ring-1 ring-current"
                        )
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  )}
                >
                  {TYPE_CONFIG[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm font-medium">
              Durée{" "}
              <span className="text-slate-500 font-normal">(optionnelle)</span>
            </Label>
            <div className="flex gap-2 flex-wrap">
              {QUICK_DURATIONS.map((d) => {
                const selected = totalMinutes === d.minutes;
                return (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => setQuickDuration(d.minutes)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-sm font-medium transition-all active:scale-95",
                      selected
                        ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/50"
                        : "bg-white/5 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="48"
                  value={durationH}
                  onChange={(e) =>
                    setDurationH(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="0"
                  className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500 pr-10 tabular-nums"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
                  h
                </span>
              </div>
              <div className="relative flex-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="59"
                  value={durationM}
                  onChange={(e) =>
                    setDurationM(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="0"
                  className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500 pr-12 tabular-nums"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
                  min
                </span>
              </div>
              {totalMinutes > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDurationH("");
                    setDurationM("");
                  }}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-colors shrink-0"
                  title="Effacer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm font-medium">
              Lieu{" "}
              <span className="text-slate-500 font-normal">(optionnel)</span>
            </Label>
            <LocationAutocomplete
              value={location}
              onChange={setLocation}
              placeholder="Aéroport CDG"
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
                {selectedParticipantIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedParticipantIds([])}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Effacer
                  </button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedParticipantIds(participants.map((p) => p.id))
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95",
                    selectedParticipantIds.length === participants.length
                      ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/40"
                      : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                  )}
                >
                  Tout le monde
                </button>
                {participants.map((p) => {
                  const selected = selectedParticipantIds.includes(p.id);
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
        </div>

        <div
          className="px-5 py-3 border-t border-white/8 bg-slate-900/50 space-y-2"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
          }}
        >
          {errorMsg && (
            <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-slate-400 hover:text-slate-200 hover:bg-white/8"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || !date || saving}
              className="flex-1 gradient-primary text-white border-0 disabled:opacity-40"
            >
              {saving ? "…" : isEdit ? "Modifier" : "Ajouter"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
