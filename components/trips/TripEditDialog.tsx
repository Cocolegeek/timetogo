"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, X, Pencil, Check, Infinity, CalendarDays, CalendarRange } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LocationPickerSheet } from "@/components/shared/LocationPickerSheet";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import { useUserId } from "@/hooks/useUserId";
import { cn } from "@/lib/utils";
import { isVoyage, tripFeatures } from "@/lib/trip-features";
import type { Trip, Participant } from "@/types";

const PARTICIPANT_COLORS = [
  "#6366f1", "#7c3aed", "#0ea5e9", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#14b8a6",
];

const EMOJIS = ["✈️", "🏖️", "🏔️", "🗺️", "🌍", "🎒", "🏕️", "🚢"];
const CURRENCIES = ["EUR", "USD", "GBP", "JPY", "CHF", "CAD"];

interface TripEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
  onSaveTrip: (data: {
    name: string;
    destination: string;
    emoji: string;
    currency: string;
    startDate?: string | null;
    endDate?: string | null;
    iconUrl?: string | null;
  }) => Promise<void>;
  /** Save only the trip icon URL (or null to remove). Independent of the
   *  rest of the form so uploading an image doesn't silently persist other
   *  in-progress edits. */
  onSaveIcon: (iconUrl: string | null) => Promise<void>;
  onAddParticipant: (data: { name: string; color: string }) => Promise<unknown>;
  onUpdateParticipant: (
    id: string,
    data: { name?: string; color?: string }
  ) => Promise<void>;
  onDeleteParticipant: (id: string) => Promise<void>;
}

export function TripEditDialog({
  open,
  onOpenChange,
  trip,
  onSaveTrip,
  onSaveIcon,
  onAddParticipant,
  onUpdateParticipant,
  onDeleteParticipant,
}: TripEditDialogProps) {
  type GroupDateMode = "permanent" | "date_fixe" | "creneau";

  function detectGroupDateMode(t: typeof trip): GroupDateMode {
    if (isVoyage(t) || !t.startDate) return "permanent";
    if (!t.endDate || t.startDate === t.endDate) return "date_fixe";
    return "creneau";
  }

  const features = tripFeatures(trip);
  const userId = useUserId();
  const [name, setName] = useState(trip.name);
  const [destination, setDestination] = useState(isVoyage(trip) ? trip.destination : "");
  const [emoji, setEmoji] = useState(trip.emoji);
  const [currency, setCurrency] = useState(trip.currency);
  const [startDate, setStartDate] = useState(isVoyage(trip) ? trip.startDate : (trip.startDate ?? ""));
  const [endDate, setEndDate] = useState(isVoyage(trip) ? trip.endDate : (trip.endDate ?? trip.startDate ?? ""));
  const [groupDateMode, setGroupDateMode] = useState<GroupDateMode>(detectGroupDateMode(trip));
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);

  // Re-sync state when dialog opens or trip changes
  useEffect(() => {
    if (open) {
      setName(trip.name);
      setDestination(isVoyage(trip) ? trip.destination : "");
      setEmoji(trip.emoji);
      setCurrency(trip.currency);
      setStartDate(isVoyage(trip) ? trip.startDate : (trip.startDate ?? ""));
      setEndDate(isVoyage(trip) ? trip.endDate : (trip.endDate ?? trip.startDate ?? ""));
      setGroupDateMode(detectGroupDateMode(trip));
      setEmojiPickerOpen(false);
      setEditingParticipantId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trip]);

  const voyageDirty = isVoyage(trip)
    ? destination !== trip.destination || startDate !== trip.startDate || endDate !== trip.endDate
    : false;
  const groupDateDirty = !isVoyage(trip) && (() => {
    const origMode = detectGroupDateMode(trip);
    if (origMode !== groupDateMode) return true;
    if (groupDateMode === "date_fixe") return startDate !== (trip.startDate ?? "");
    if (groupDateMode === "creneau") return startDate !== (trip.startDate ?? "") || endDate !== (trip.endDate ?? "");
    return false;
  })();
  const dirty =
    name !== trip.name ||
    emoji !== trip.emoji ||
    currency !== trip.currency ||
    voyageDirty ||
    groupDateDirty;

  const groupDateValid = !isVoyage(trip)
    ? groupDateMode === "permanent" ||
      (groupDateMode === "date_fixe" && !!startDate) ||
      (groupDateMode === "creneau" && !!startDate && !!endDate && endDate >= startDate)
    : true;
  const formValid =
    name.trim().length > 0 &&
    (features.hasDestination ? destination.trim().length > 0 : true) &&
    (features.hasDates ? !!startDate && !!endDate : true) &&
    groupDateValid;

  const handleSaveTrip = async () => {
    if (!formValid || !dirty) return;
    setSaving(true);
    try {
      let saveStartDate: string | null | undefined;
      let saveEndDate: string | null | undefined;
      if (features.hasDates) {
        saveStartDate = startDate;
        saveEndDate = endDate;
      } else if (!isVoyage(trip)) {
        if (groupDateMode === "permanent") {
          saveStartDate = null;
          saveEndDate = null;
        } else if (groupDateMode === "date_fixe") {
          saveStartDate = startDate || null;
          saveEndDate = startDate || null;
        } else {
          saveStartDate = startDate || null;
          saveEndDate = endDate || null;
        }
      }
      await onSaveTrip({
        name: name.trim(),
        destination: features.hasDestination ? destination.trim() : "",
        emoji,
        currency,
        startDate: saveStartDate,
        endDate: saveEndDate,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddParticipant = async () => {
    const trimmed = newParticipantName.trim();
    if (!trimmed) return;
    const color =
      PARTICIPANT_COLORS[trip.participants.length % PARTICIPANT_COLORS.length];
    await onAddParticipant({ name: trimmed, color });
    setNewParticipantName("");
  };

  const startEditingParticipant = (p: Participant) => {
    setEditingParticipantId(p.id);
    setEditingName(p.name);
  };

  const confirmEditingParticipant = async () => {
    if (!editingParticipantId) return;
    const trimmed = editingName.trim();
    if (!trimmed) return setEditingParticipantId(null);
    await onUpdateParticipant(editingParticipantId, { name: trimmed });
    setEditingParticipantId(null);
  };

  const handleDeleteParticipant = async (p: Participant) => {
    if (
      !confirm(
        `Retirer ${p.name} du voyage ?\n\nLes dépenses où ${p.name} apparaît resteront mais ne seront plus liées.`
      )
    )
      return;
    await onDeleteParticipant(p.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glass-strong border-foreground/10 max-w-md p-0 max-h-[92vh] overflow-hidden flex flex-col"
        showCloseButton={false}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-foreground/8">
          <DialogTitle className="text-slate-100 text-xl">
            {isVoyage(trip) ? "Modifier le voyage" : "Modifier le budget"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Custom icon — upload + crop */}
          {userId && (
            <div className="flex flex-col items-center gap-2">
              <AvatarUpload
                bucket="trip-icons"
                path={`${userId}/${trip.id}.webp`}
                currentUrl={trip.iconUrl ?? null}
                size={88}
                ringClass="ring-2 ring-section/40"
                placeholder={<span className="text-4xl">{emoji}</span>}
                dialogTitle="Recadrer l'icône du voyage"
                onUploaded={(url) => onSaveIcon(url)}
                onRemoved={() => onSaveIcon(null)}
              />
              <p className="text-xs text-slate-500">
                {trip.iconUrl ? "Tap pour changer" : "Ou choisis un emoji ↓"}
              </p>
            </div>
          )}

          {/* Name + emoji */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm font-medium">
              Nom du voyage
            </Label>
            <div className="flex items-stretch gap-2 bg-foreground/8 border border-foreground/10 rounded-lg focus-within:ring-3 focus-within:ring-section transition-all overflow-hidden">
              <button
                type="button"
                onClick={() => setEmojiPickerOpen((v) => !v)}
                className="w-12 h-11 flex items-center justify-center text-2xl hover:bg-foreground/8 active:bg-foreground/12 transition-colors shrink-0"
                aria-label="Changer l'emoji"
              >
                {emoji}
              </button>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                          setEmoji(e);
                          setEmojiPickerOpen(false);
                        }}
                        className={cn(
                          "w-10 h-10 rounded-lg text-xl transition-all",
                          emoji === e
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
          </div>

          {/* Destination — voyages only */}
          {features.hasDestination && (
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">Destination</Label>
              <LocationPickerSheet
                value={destination}
                onChange={setDestination}
                placeholder="Rome, Italie"
                className="bg-foreground/8 border-foreground/10"
              />
            </div>
          )}

          {/* Dates — groupes: sélecteur Permanent / Date fixe / Créneau */}
          {!isVoyage(trip) && (
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-medium">Période</Label>
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
                      setGroupDateMode(mode);
                      setStartDate("");
                      setEndDate("");
                    }}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-medium transition-all active:scale-95",
                      groupDateMode === mode
                        ? "bg-section-soft text-section-soft ring-1 ring-section"
                        : "bg-foreground/5 text-slate-400 hover:bg-foreground/10"
                    )}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
              <AnimatePresence initial={false}>
                {groupDateMode !== "permanent" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className={cn("pt-1", groupDateMode === "creneau" ? "grid grid-cols-2 gap-2" : "")}>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">
                          {groupDateMode === "creneau" ? "Début" : "Date"}
                        </Label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-foreground/8 border border-foreground/10 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-section [color-scheme:dark]"
                        />
                      </div>
                      {groupDateMode === "creneau" && (
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-400">Fin</Label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate || undefined}
                            className="w-full bg-foreground/8 border border-foreground/10 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-section [color-scheme:dark]"
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Dates — voyages: même DateRangePicker qu'à la création */}
          {features.hasDates && startDate && endDate && (
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
            />
          )}

          {/* Currency */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm font-medium">
              Devise principale
            </Label>
            <div className="flex gap-2 flex-wrap">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-sm font-medium transition-all active:scale-95",
                    currency === c
                      ? "bg-section-soft text-section-soft ring-1 ring-section"
                      : "bg-foreground/5 text-slate-400 hover:bg-foreground/10"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            {currency !== trip.currency && (
              <p className="text-xs text-amber-400">
                ⚠️ Changer la devise n'effectue pas de conversion automatique
                des dépenses existantes.
              </p>
            )}
          </div>

          {/* Save trip metadata */}
          {dirty && (
            <Button
              onClick={handleSaveTrip}
              disabled={saving || !formValid}
              className="w-full gradient-primary text-white border-0"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Enregistrer les modifications"
              )}
            </Button>
          )}

          <div className="border-t border-foreground/8 -mx-5" />

          {/* Participants */}
          <div className="space-y-3">
            <Label className="text-slate-300 text-sm font-medium">
              Voyageurs ({trip.participants.length})
            </Label>

            <div className="space-y-1.5">
              {trip.participants.map((p) => {
                const isEditing = editingParticipantId === p.id;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-foreground/4 border border-foreground/8"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    {isEditing ? (
                      <>
                        <input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmEditingParticipant();
                            if (e.key === "Escape") setEditingParticipantId(null);
                          }}
                          className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-100"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={confirmEditingParticipant}
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-foreground/8"
                        >
                          <Check size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-slate-200 truncate">
                          {p.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => startEditingParticipant(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-foreground/8"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteParticipant(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Input
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddParticipant();
                  }
                }}
                placeholder="Embarquer quelqu'un"
                className="bg-foreground/8 border-foreground/10 text-slate-100 placeholder:text-slate-500"
              />
              <Button
                type="button"
                onClick={handleAddParticipant}
                disabled={!newParticipantName.trim()}
                className="shrink-0 bg-section-soft hover:bg-section-medium text-section-soft border border-section disabled:opacity-40"
              >
                <Plus size={16} />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t border-foreground/8 bg-slate-900/50"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
          }}
        >
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="w-full text-slate-300 hover:text-slate-100 hover:bg-foreground/8"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
