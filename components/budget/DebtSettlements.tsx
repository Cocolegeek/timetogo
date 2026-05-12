"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import { AllSettledEmpty } from "./AllSettledEmpty";
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
    return <AllSettledEmpty />;
  }

  const pendingFrom = pending ? participants.find((p) => p.id === pending.fromId) : null;
  const pendingTo = pending ? participants.find((p) => p.id === pending.toId) : null;

  return (
    <>
      <div className="space-y-3">
        {settlements.map((s, i) => {
          const from = participants.find((p) => p.id === s.fromId);
          const to = participants.find((p) => p.id === s.toId);
          if (!from || !to) return null;

          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setPending(s)}
              className="w-full glass-subtle border border-section rounded-2xl px-4 py-4 flex flex-col gap-3 text-left active:scale-[0.98] transition-transform"
            >
              {/* Participants */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: from.color }}
                  />
                  <span className="text-lg font-semibold text-slate-100 truncate">
                    {from.name}
                  </span>
                </div>

                <ArrowDown size={14} className="text-slate-500 shrink-0 rotate-[-90deg]" />

                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: to.color }}
                  />
                  <span className="text-base font-semibold text-slate-100 truncate">
                    {to.name}
                  </span>
                </div>
              </div>

              {/* Amount + hint */}
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-section-soft tabular-nums">
                  {formatCurrency(s.amount, currency)}
                </span>
                <span className="text-xs font-semibold text-section-soft mb-0.5 px-2 py-0.5 rounded-md bg-section-soft border border-section">
                  Régler ma dette
                </span>
              </div>
            </motion.button>
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
              <div className="glass-subtle rounded-xl px-4 py-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: pendingFrom.color }}
                  />
                  <span className="font-semibold text-slate-100">{pendingFrom.name}</span>
                  <span className="text-slate-500 text-sm">rembourse</span>
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: pendingTo.color }}
                  />
                  <span className="font-semibold text-slate-100">{pendingTo.name}</span>
                </div>
                <p className="text-2xl font-bold text-section-soft tabular-nums">
                  {formatCurrency(pending.amount, currency)}
                </p>
              </div>
              <p className="text-sm text-slate-400">
                Un remboursement sera ajouté dans les dépenses et les soldes seront mis à jour.
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
              {loading ? <Loader2 size={15} className="animate-spin" /> : "Régler"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
