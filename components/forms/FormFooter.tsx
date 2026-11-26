"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Barre d'action en bas, sous le pouce. Jamais grisée sans explication : le message dit ce qui manque. */
export function FormFooter({
  label,
  onClick,
  loading,
  message,
  shakeKey,
  className,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  message?: string | null;
  shakeKey?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("shrink-0 border-t border-border bg-background px-4 pt-3", className)}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      {message && (
        <p
          key={shakeKey}
          role="alert"
          className="animate-shake mb-3 rounded-2xl bg-red-500/10 px-4 py-2.5 text-[0.95rem] font-medium text-red-400"
        >
          {message}
        </p>
      )}
      <div className="mx-auto max-w-xl">
        <Button size="lg" onClick={onClick} disabled={loading} className="w-full shadow-section">
          {loading ? <Loader2 size={18} className="animate-spin" /> : label}
        </Button>
      </div>
    </div>
  );
}
