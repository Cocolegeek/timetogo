"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { springSoft } from "@/lib/motion";

/** Floating add button, anchored above the trip nav. */
export function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.92 }}
      transition={{ ...springSoft, delay: 0.2 }}
      className="fixed right-5 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-section-strong outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
      style={{ bottom: "var(--fab-bottom)" }}
    >
      <Plus size={26} strokeWidth={2.4} />
    </motion.button>
  );
}
