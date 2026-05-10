"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface ConfirmDeleteDialogProps {
  title: string;
  description: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({
  title,
  description,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong border border-foreground/10 rounded-2xl p-5 max-w-sm w-full space-y-4"
      >
        <div>
          <h3 className="text-lg font-bold text-slate-100">{title}</h3>
          <p className="text-sm text-slate-400 mt-1">{description}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 h-11 rounded-lg bg-foreground/5 hover:bg-foreground/8 text-slate-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={async () => {
              setDeleting(true);
              await onConfirm();
              setDeleting(false);
            }}
            disabled={deleting}
            className="flex-1 h-11 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-semibold border border-red-500/30 transition-colors disabled:opacity-50"
          >
            {deleting ? "…" : "Supprimer"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
