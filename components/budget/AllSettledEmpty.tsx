"use client";

import { Check } from "lucide-react";

export function AllSettledEmpty() {
  return (
    <div className="animate-fade-up flex flex-col items-center gap-4 px-6 py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-[1.25rem] bg-emerald-500 text-white shadow-raised">
        <Check size={30} strokeWidth={2.6} />
      </span>
      <div className="space-y-1.5">
        <p className="font-display text-xl font-bold tracking-tight">Tout le monde est quitte</p>
        <p className="mx-auto max-w-xs text-[0.95rem] leading-relaxed text-muted-foreground">
          Dès qu&apos;une dépense est ajoutée, Voyou calcule ici le minimum de virements pour solder les comptes.
        </p>
      </div>
    </div>
  );
}
