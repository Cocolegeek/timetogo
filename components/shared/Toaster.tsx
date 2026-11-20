"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, TriangleAlert } from "lucide-react";
import { spring } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type ToastTone = "default" | "success" | "error";

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
  /** ms, default 3200 (5000 when an action is present). */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

const ToastContext = createContext<(opts: ToastOptions) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = { default: Info, success: Check, error: TriangleAlert } as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (opts: ToastOptions) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-2), { ...opts, id }]);
      if (opts.tone === "success") haptic("success");
      if (opts.tone === "error") haptic("warning");
      setTimeout(() => dismiss(id), opts.duration ?? (opts.action ? 5000 : 3200));
    },
    [dismiss]
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 6.25rem)" }}
      >
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const Icon = ICONS[t.tone ?? "default"];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.18 } }}
                transition={spring}
                role="status"
                className="pointer-events-auto flex min-h-12 w-full max-w-sm items-center gap-3 rounded-full bg-foreground py-1.5 pr-1.5 pl-4 text-background shadow-float"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full",
                    t.tone === "success" ? "bg-emerald-500 text-white" : t.tone === "error" ? "bg-red-500 text-white" : "bg-background/15"
                  )}
                >
                  <Icon size={14} strokeWidth={2.6} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.95rem] font-medium">{t.message}</span>
                {t.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      t.action!.onClick();
                      dismiss(t.id);
                    }}
                    className="h-9 shrink-0 rounded-full bg-background/15 px-4 text-sm font-semibold transition-colors hover:bg-background/25"
                  >
                    {t.action.label}
                  </button>
                ) : (
                  <span className="w-2" />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
