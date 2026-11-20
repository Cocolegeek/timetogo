"use client";

import { Check } from "lucide-react";

export function IAmSettledEmpty() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500 text-white">
        <Check size={20} strokeWidth={2.6} />
      </span>
      <span className="font-semibold text-emerald-300">Tu es quitte</span>
    </div>
  );
}
