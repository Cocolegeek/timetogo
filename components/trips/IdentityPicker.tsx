"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserCheck, UserPlus, X, Loader2 } from "lucide-react";
import { ParticipantAvatar } from "@/components/shared/ParticipantAvatar";
import { cn } from "@/lib/utils";
import type { Participant } from "@/types";

interface IdentityPickerProps {
  participants: Participant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /**
   * Optional: when provided, an "Ajouter un participant" tile is shown.
   * The callback should create the participant in the data layer and
   * resolve to the newly-created Participant (with a stable id).
   * The picker will auto-select the new participant after creation.
   */
  onCreate?: (name: string) => Promise<Participant>;
  /** Mode compact : inline dans le dashboard vs plein écran au join */
  compact?: boolean;
}

const FALLBACK_COLORS = [
  "#6366f1", "#7c3aed", "#0ea5e9", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#14b8a6",
];

function nextColor(existing: Participant[]): string {
  return FALLBACK_COLORS[existing.length % FALLBACK_COLORS.length];
}

export function IdentityPicker({
  participants,
  selectedId,
  onSelect,
  onCreate,
  compact = false,
}: IdentityPickerProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewColor = nextColor(participants);

  const handleCreate = async () => {
    if (!onCreate) return;
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const created = await onCreate(name);
      onSelect(created.id);
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
      {!compact && (
        <div className="flex items-center gap-3 pb-1">
          <div className="w-9 h-9 rounded-xl bg-section-soft flex items-center justify-center shrink-0">
            <UserCheck size={20} className="text-section" />
          </div>
          <p className="text-lg font-semibold text-slate-100 leading-snug">
            Qui es-tu parmi les voyageurs ?
          </p>
        </div>
      )}

      <div className={cn("grid gap-2", compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
        {participants.map((p, i) => {
          const isSelected = selectedId === p.id;
          return (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              type="button"
              onClick={() => onSelect(p.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left",
                isSelected
                  ? "border-section-strong bg-section-tint ring-1 ring-section"
                  : "border-foreground/8 bg-foreground/4 hover:border-foreground/15 hover:bg-foreground/8"
              )}
            >
              <ParticipantAvatar participant={p} size={compact ? "sm" : "md"} />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-semibold text-base truncate",
                    isSelected ? "text-section-soft" : "text-slate-200"
                  )}
                >
                  {p.name}
                </p>
                {isSelected && (
                  <p className="text-sm text-section">C&apos;est moi</p>
                )}
              </div>
              {isSelected && (
                <div className="w-2 h-2 rounded-full bg-section shrink-0" />
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
            className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-foreground/20 bg-foreground/2 hover:border-section hover:bg-section-tint transition-all duration-200 text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-foreground/8 group-hover:bg-section-soft flex items-center justify-center shrink-0 transition-colors">
              <UserPlus size={18} className="text-slate-400 group-hover:text-section transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base text-slate-300 group-hover:text-section-soft transition-colors">
                Je ne suis pas dans la liste
              </p>
              <p className="text-sm text-slate-500">
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
            <div className="p-3 rounded-xl border border-section bg-section-tint space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: previewColor }}
                  />
                  <span className="text-sm font-medium text-slate-300">Nouveau participant</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    setNewName("");
                    setError(null);
                  }}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-foreground/8 transition-colors"
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
                className="w-full bg-foreground/8 border border-foreground/10 rounded-lg px-3 py-2.5 text-base text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-section focus:border-section"
              />

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              <button
                type="button"
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="w-full gradient-primary text-white border-0 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
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
    </div>
  );
}
