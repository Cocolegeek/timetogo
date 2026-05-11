"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, X, Pencil, Check } from "lucide-react";
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
import { LocationAutocomplete } from "@/components/shared/LocationAutocomplete";
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
    startDate: string;
    endDate: string;
  }) => Promise<void>;
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
  onAddParticipant,
  onUpdateParticipant,
  onDeleteParticipant,
}: TripEditDialogProps) {
  const features = tripFeatures(trip);
  const [name, setName] = useState(trip.name);
  const [destination, setDestination] = useState(isVoyage(trip) ? trip.destination : "");
  const [emoji, setEmoji] = useState(trip.emoji);
  const [currency, setCurrency] = useState(trip.currency);
  const [startDate, setStartDate] = useState(isVoyage(trip) ? trip.startDate : "");
  const [endDate, setEndDate] = useState(isVoyage(trip) ? trip.endDate : "");
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
      setStartDate(isVoyage(trip) ? trip.startDate : "");
      setEndDate(isVoyage(trip) ? trip.endDate : "");
      setEmojiPickerOpen(false);
      setEditingParticipantId(null);
    }
  }, [open, trip]);

  const voyageDirty = isVoyage(trip)
    ? destination !== trip.destination || startDate !== trip.startDate || endDate !== trip.endDate
    : false;
  const dirty =
    name !== trip.name ||
    emoji !== trip.emoji ||
    currency !== trip.currency ||
    voyageDirty;

  const formValid =
    name.trim().length > 0 &&
    (features.hasDestination ? destination.trim().length > 0 : true) &&
    (features.hasDates ? !!startDate && !!endDate : true);

  const handleSaveTrip = async () => {
    if (!formValid || !dirty) return;
    setSaving(true);
    try {
      await onSaveTrip({
        name: name.trim(),
        destination: features.hasDestination ? destination.trim() : "",
        emoji,
        currency,
        startDate: features.hasDates ? startDate : "",
        endDate: features.hasDates ? endDate : "",
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
              <LocationAutocomplete
                value={destination}
                onChange={setDestination}
                placeholder="Rome, Italie"
                className="bg-foreground/8 border-foreground/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-section"
              />
            </div>
          )}

          {/* Dates — voyages only */}
          {features.hasDates && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm font-medium">Départ</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-foreground/8 border-foreground/10 text-slate-100 [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm font-medium">Retour</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-foreground/8 border-foreground/10 text-slate-100 [color-scheme:dark]"
                />
              </div>
            </div>
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
                placeholder="Ajouter un voyageur"
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
