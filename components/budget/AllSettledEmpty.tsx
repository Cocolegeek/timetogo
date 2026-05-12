"use client";

import { CheckCircle2 } from "lucide-react";

export function AllSettledEmpty() {
  return (
    <div className="space-y-2 py-2">
      <div className="flex items-center gap-2 text-base text-emerald-400 font-semibold">
        <CheckCircle2 size={18} />
        <span>Tout le monde est quitte !</span>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">
        Dès que des dépenses sont ajoutées, Voyou calcule ici le minimum de virements pour solder les comptes entre vous.
      </p>
    </div>
  );
}
