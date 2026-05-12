"use client";

import { CheckCircle2 } from "lucide-react";

export function IAmSettledEmpty() {
  return (
    <div className="flex items-center gap-2 text-base text-emerald-400 font-semibold py-1">
      <CheckCircle2 size={18} />
      <span>Tu es quitte ✓</span>
    </div>
  );
}
