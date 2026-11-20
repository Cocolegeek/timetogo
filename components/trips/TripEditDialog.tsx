"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, X, Pencil, Check, Infinity, CalendarDays, CalendarRange } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LocationPickerSheet } from "@/components/shared/LocationPickerSheet";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { DateField } from "@/components/shared/DateTimeFields";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import { useUserId } from "@/hooks/useUserId";
import { cn } from "@/lib/utils";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import { isVoyage, tripFeatures } from "@/lib/trip-features";
import type { Trip, Participant } from "@/types";
import { PARTICIPANT_COLORS } from "@/lib/participant-colors";
import { FriendPicker } from "@/components/trips/FriendPicker";
import { useToast } from "@/components/shared/Toaster";
import { useTrip } from "@/hooks/useTrip";
import { addFriendsToTrip } from "@/hooks/useFriends";


const EMOJIS = ["✈️", "🏖️", "🏔️", "🗺️", "🌍", "🎒", "🏕️", "🚢"];
const CURRENCIES = ["EUR", "USD", "GBP", "JPY", "CHF", "CAD"];

type NavTab = "Général" | "Participants";

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
  const toast = useToast();
  const { claims, refetch: refetchTrip, refetchClaims } = useTrip(trip.id);
  type GroupDateMode = "permanent" | "date_fixe" | "creneau";

  function detectGroupDateMode(t: typeof trip): GroupDateMode {
    if (isVoyage(t) || !t.startDate) return "permanent";
    if (!t.endDate || t.startDate === t.endDate) return "date_fixe";
    return "creneau";
  }

  const features = tripFeatures(trip);
  const userId = useUserId();
  const [activeTab, setActiveTab] = useState<NavTab>("Général");
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

  useEffect(() => {
    if (open) {
      setActiveTab("Général");
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 flex flex-col overflow-hidden"
        style={{ height: "92dvh" }}
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-7 pr-16 pb-3">
          <SheetTitle>
            {isVoyage(trip) ? "Modifier le voyage" : "Modifier le budget"}
          </SheetTitle>
        </div>

        {/* Tab navigation */}
        <div role="tablist" className="mx-5 mb-2 flex h-11 shrink-0 gap-1 rounded-full bg-foreground/[0.06] p-1">
          {(["Général", "Participants"] as NavTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 rounded-full text-sm font-semibold transition-all",
                activeTab === tab
                  ? "bg-card text-foreground shadow-card dark:bg-foreground/[0.12]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
              {tab === "Participants" && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({trip.participants.length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* ── Général ── */}
          {activeTab === "Général" && (
            <>
              {userId && (
                <div className="flex flex-col items-center gap-2">
                  <AvatarUpload
                    bucket="trip-icons"
                    path={`${userId}/${trip.id}.webp`}
                    currentUrl={trip.iconUrl ?? null}
                    size={88}
                    ringClass="ring-2 ring-foreground/40"
                    placeholder={<span className="text-4xl">{emoji}</span>}
                    dialogTitle="Recadrer l'icône du voyage"
                    onUploaded={(url) => onSaveIcon(url)}
                    onRemoved={() => onSaveIcon(null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {trip.iconUrl ? "Tap pour changer" : "Ou choisis un emoji ↓"}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="px-1 text-sm font-semibold text-foreground">
                  {isVoyage(trip) ? "Nom du voyage" : "Nom du budget"}
                </Label>
                <div className="flex items-stretch gap-2 h-12 rounded-2xl border border-input bg-card transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/12 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setEmojiPickerOpen((v) => !v)}
                    className="w-12 h-full flex items-center justify-center text-2xl hover:bg-foreground/[0.06] active:bg-foreground/10 transition-colors shrink-0"
                    aria-label="Changer l'emoji"
                  >
                    {emoji}
                  </button>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                              setEmoji(e);
                              setEmojiPickerOpen(false);
                            }}
                            className={cn(
                              "w-10 h-10 rounded-lg text-xl transition-all",
                              emoji === e
                                ? "bg-foreground/[0.06] ring-1 ring-foreground/40"
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
              </div>

              {features.hasDestination && (
                <div className="space-y-1.5">
                  <Label className="px-1 text-sm font-semibold text-foreground">Destination</Label>
                  <LocationPickerSheet
                    value={destination}
                    onChange={setDestination}
                    placeholder="Rome, Italie"

                  />
                </div>
              )}

              {!isVoyage(trip) && (
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
                          setGroupDateMode(mode);
                          setStartDate("");
                          setEndDate("");
                        }}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-medium transition-all active:scale-95",
                          groupDateMode === mode
                            ? "bg-primary/10 text-primary ring-1 ring-primary/40"
                            : "bg-secondary text-muted-foreground hover:bg-foreground/[0.08]"
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
                            <Label className="text-xs text-muted-foreground">
                              {groupDateMode === "creneau" ? "Début" : "Date"}
                            </Label>
                            <DateField value={startDate} onChange={setStartDate} label={groupDateMode === "creneau" ? "Début" : "Date"} />
                          </div>
                          {groupDateMode === "creneau" && (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Fin</Label>
                              <DateField value={endDate} onChange={setEndDate} label="Fin" min={startDate || undefined} />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {features.hasDates && startDate && endDate && (
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
                />
              )}

              <div className="space-y-2">
                <Label className="px-1 text-sm font-semibold text-foreground">
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
                          ? "bg-primary/10 text-primary ring-1 ring-primary/40"
                          : "bg-secondary text-muted-foreground hover:bg-foreground/[0.08]"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {currency !== trip.currency && (
                  <p className="rounded-2xl bg-amber-500/12 px-3.5 py-2.5 text-xs text-amber-400">
                    Changer la devise ne convertit pas les dépenses existantes.
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── Participants ── */}
          {activeTab === "Participants" && (
            <div className="space-y-3">
              <FriendPicker
                selected={[]}
                exclude={claims.map((c) => c.userId)}
                className="pb-3"
                onToggle={async (f) => {
                  try {
                    await addFriendsToTrip(trip.id, [
                      { id: f.id, color: PARTICIPANT_COLORS[trip.participants.length % PARTICIPANT_COLORS.length] },
                    ]);
                    await Promise.all([refetchTrip(), refetchClaims()]);
                    toast({ message: `${f.name?.split(" ")[0] ?? "Ton pote"} est embarqué`, tone: "success" });
                  } catch {
                    toast({ message: "Impossible de l'ajouter. Réessaie.", tone: "error" });
                  }
                }}
              />
              <div className="overflow-hidden rounded-[1.25rem] bg-secondary">
                {trip.participants.map((p, i) => {
                  const isEditing = editingParticipantId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={cn("flex h-14 items-center gap-3 pr-1.5 pl-3.5", i > 0 && "border-t border-border")}
                    >
                      <ParticipantAvatar participant={p} size="sm" className="ring-secondary" />
                      {isEditing ? (
                        <>
                          <input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmEditingParticipant();
                              if (e.key === "Escape") setEditingParticipantId(null);
                            }}
                            aria-label={`Renommer ${p.name}`}
                            className="min-w-0 flex-1 border-0 bg-transparent text-[0.95rem] font-medium text-foreground outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={confirmEditingParticipant}
                            aria-label="Valider le nom"
                            className="flex size-11 items-center justify-center rounded-full text-foreground hover:bg-foreground/[0.06]"
                          >
                            <Check size={18} strokeWidth={2.4} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="min-w-0 flex-1 truncate text-[0.95rem] font-medium text-foreground">
                            {p.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditingParticipant(p)}
                            aria-label={`Renommer ${p.name}`}
                            className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteParticipant(p)}
                            aria-label={`Retirer ${p.name}`}
                            className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                          >
                            <X size={17} />
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
                />
                <Button
                  type="button"
                  size="icon-lg"
                  onClick={handleAddParticipant}
                  disabled={!newParticipantName.trim()}
                  aria-label="Ajouter"
                  className="shrink-0 rounded-full"
                >
                  <Plus size={18} />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer — toujours visible */}
        <div
          className="px-5 py-3 border-t border-border bg-popover shrink-0 flex gap-2"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <Button onClick={() => onOpenChange(false)} variant="secondary" size="lg" className="flex-1">
            Fermer
          </Button>
          {activeTab === "Général" && (
            <Button
              onClick={handleSaveTrip}
              disabled={saving || !dirty || !formValid}
              size="lg"
              className="flex-[2] shadow-section disabled:shadow-none"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Enregistrer"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
