"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, UserPlus, X, Loader2, AlertTriangle } from "lucide-react";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Participant } from "@/types";
import { PARTICIPANT_COLORS } from "@/lib/participant-colors";

export interface IdentityClaim {
  participantId: string;
  userId: string;
  userName: string | null;
  isPrimary: boolean;
}

interface IdentityPickerProps {
  participants: Participant[];
  selectedId: string | null;
  onSelect: (id: string) => void | Promise<void>;
  /**
   * Optional: when provided, an "Ajouter un participant" tile is shown.
   * The callback should create the participant in the data layer and
   * resolve to the newly-created Participant (with a stable id).
   * The picker will auto-select the new participant after creation.
   */
  onCreate?: (name: string) => Promise<Participant>;
  /** Mode compact : inline dans le dashboard vs plein écran au join */
  compact?: boolean;
  /** Liste des liens user→participant. Quand fournie, le picker affiche
   *  "déjà lié à X" et demande confirmation pour reprendre l'identité. */
  claims?: IdentityClaim[];
  /** UID de l'utilisateur connecté — sert à savoir si une revendication
   *  primary est la sienne ou celle d'un autre. */
  currentUserId?: string | null;
}


function nextColor(existing: Participant[]): string {
  return PARTICIPANT_COLORS[existing.length % PARTICIPANT_COLORS.length];
}

export function IdentityPicker({
  participants,
  selectedId,
  onSelect,
  onCreate,
  compact = false,
  claims,
  currentUserId,
}: IdentityPickerProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    participant: Participant;
    primaryName: string | null;
  } | null>(null);
  const [claiming, setClaiming] = useState(false);

  const previewColor = nextColor(participants);

  const primaryByParticipant = new Map<string, IdentityClaim>();
  for (const c of claims ?? []) {
    if (c.isPrimary) primaryByParticipant.set(c.participantId, c);
  }

  const handleParticipantClick = (p: Participant) => {
    const primary = primaryByParticipant.get(p.id);
    if (primary && primary.userId !== currentUserId) {
      setConfirmTarget({ participant: p, primaryName: primary.userName });
      return;
    }
    void onSelect(p.id);
  };

  const handleConfirmClaim = async () => {
    if (!confirmTarget) return;
    setClaiming(true);
    try {
      await onSelect(confirmTarget.participant.id);
      setConfirmTarget(null);
    } finally {
      setClaiming(false);
    }
  };

  const handleCreate = async () => {
    if (!onCreate) return;
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const created = await onCreate(name);
      await onSelect(created.id);
      setNewName("");
      setAddOpen(false);
    } catch {
      setError("Impossible de créer le participant. Réessaie.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className={cn("grid gap-2", compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
        {participants.map((p, i) => {
          const isSelected = selectedId === p.id;
          const primary = primaryByParticipant.get(p.id);
          const claimedByOther = primary && primary.userId !== currentUserId;
          return (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              type="button"
              onClick={() => handleParticipantClick(p)}
              className={cn(
                "pressable flex min-h-14 items-center gap-3 rounded-2xl p-3 text-left transition-colors",
                isSelected
                  ? "bg-primary/10 ring-2 ring-primary"
                  : "bg-secondary hover:bg-foreground/[0.08]"
              )}
            >
              <ParticipantAvatar participant={p} size={compact ? "sm" : "md"} />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-semibold text-base truncate",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                >
                  {p.name}
                </p>
                {isSelected ? (
                  <p className="text-sm font-medium text-primary">C&apos;est moi</p>
                ) : claimedByOther ? (
                  <p className="text-sm text-amber-400 truncate">
                    Lié à {primary?.userName ?? "un autre membre"}
                  </p>
                ) : null}
              </div>
              {isSelected && (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </motion.button>
          );
        })}

        {onCreate && !addOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: participants.length * 0.04 }}
            type="button"
            onClick={() => setAddOpen(true)}
            className="group pressable flex min-h-14 items-center gap-3 rounded-2xl border border-dashed border-foreground/25 p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/[0.04]"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground/[0.07] text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              <UserPlus size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground">
                Je ne suis pas dans la liste
              </p>
              <p className="text-sm text-muted-foreground">
                Créer un nouveau participant
              </p>
            </div>
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {onCreate && addOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-2xl bg-primary/[0.06] p-3 ring-1 ring-primary/25">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: previewColor }}
                  />
                  <span className="text-sm font-medium text-foreground/85">Nouveau participant</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    setNewName("");
                    setError(null);
                  }}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground/85 hover:bg-foreground/[0.06] transition-colors"
                  aria-label="Annuler"
                >
                  <X size={16} />
                </button>
              </div>

              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="Ton prénom"
                autoFocus
                className="w-full border px-3 py-2.5 text-base outline-none border-input bg-card rounded-2xl h-12 placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/12 tabular"
              />

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              <button
                type="button"
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="pressable flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[0.95rem] font-semibold text-primary-foreground disabled:opacity-40"
              >
                {creating ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <>
                    <UserPlus size={15} />
                    Ajouter et sélectionner
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation modal — claimed by another user */}
      <AnimatePresence>
        {confirmTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center dark:bg-black/65"
            onClick={() => !claiming && setConfirmTarget(null)}
          >
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="w-full max-w-sm space-y-5 rounded-[1.75rem] bg-popover p-6 shadow-float"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15">
                  <AlertTriangle size={18} className="text-amber-400" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="font-display text-lg font-bold tracking-tight">
                    Identité déjà revendiquée
                  </h3>
                  <p className="text-sm text-muted-foreground leading-snug">
                    <span className="text-foreground font-medium">
                      {confirmTarget.primaryName ?? "Un autre membre"}
                    </span>{" "}
                    est déjà lié à{" "}
                    <span className="text-foreground font-medium">
                      {confirmTarget.participant.name}
                    </span>
                    . En continuant, tu deviens le compte principal pour cette
                    identité. Ses infos de paiement ne seront plus affichées.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmTarget(null)}
                  disabled={claiming}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleConfirmClaim}
                  disabled={claiming}
                  className="flex-1"
                >
                  {claiming ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    "C'est moi"
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
