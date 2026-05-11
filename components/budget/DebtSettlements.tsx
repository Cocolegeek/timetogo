"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Settlement, Participant } from "@/types";

interface DebtSettlementsProps {
  settlements: Settlement[];
  participants: Participant[];
  currency: string;
  onSettle: (settlement: Settlement) => Promise<void>;
}

export function DebtSettlements({
  settlements,
  participants,
  currency,
  onSettle,
}: DebtSettlementsProps) {
  const [pending, setPending] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!pending) return;
    setLoading(true);
    try {
      await onSettle(pending);
      setPending(null);
    } finally {
      setLoading(false);
    }
  };

  if (settlements.length === 0) {
    return (
      <div className="space-y-2 py-2">
        <div className="flex items-center gap-2 text-base text-emerald-400 font-semibold">
          <CheckCircle2 size={18} />
          <span>Tout le monde est quitte !</span>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          Dès que des dépenses sont ajoutées, Time to Go calcule ici le minimum de virements pour solder les comptes entre vous.
        </p>
      </div>
    );
  }

  const pendingFrom = pending ? participants.find((p) => p.id === pending.fromId) : null;
  const pendingTo = pending ? participants.find((p) => p.id === pending.toId) : null;

  return (
    <>
      <div className="space-y-2">
        {settlements.map((s, i) => {
          const from = participants.find((p) => p.id === s.fromId);
          const to = participants.find((p) => p.id === s.toId);
          if (!from || !to) return null;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-subtle rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: from.color }}
                />
                <span className="text-base text-slate-100 font-semibold truncate">
                  {from.name}
                </span>
                <ArrowRight size={14} className="text-slate-500 shrink-0" />
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: to.color }}
                />
                <span className="text-base text-slate-100 font-semibold truncate">
                  {to.name}
                </span>
              </div>
              <span className="font-bold text-base text-indigo-300 shrink-0 tabular-nums">
                {formatCurrency(s.amount, currency)}
              </span>
              <button
                onClick={() => setPending(s)}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/35 active:scale-95 transition-all"
              >
                Régler
              </button>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={!!pending} onOpenChange={(open) => { if (!open && !loading) setPending(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmer le remboursement</DialogTitle>
          </DialogHeader>

          {pendingFrom && pendingTo && pending && (
            <div className="py-2 space-y-4">
              <div className="glass-subtle rounded-xl px-4 py-3 flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: pendingFrom.color }}
                />
                <span className="font-semibold text-slate-100">{pendingFrom.name}</span>
                <ArrowRight size={14} className="text-slate-500 shrink-0" />
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: pendingTo.color }}
                />
                <span className="font-semibold text-slate-100">{pendingTo.name}</span>
                <span className="ml-auto font-bold text-indigo-300 tabular-nums">
                  {formatCurrency(pending.amount, currency)}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Cela ajoutera un remboursement dans les dépenses et mettra les soldes à jour.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setPending(null)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="gradient-primary text-white border-0"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
