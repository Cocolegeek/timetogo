"use client";

import { useState } from "react";
import { m as motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { isBootScreen } from "@/lib/boot";

export function PageTransition({ children }: { children: React.ReactNode }) {
  // On launch the server-rendered page must be visible before any JS runs: no opacity 0.
  const [animate] = useState(() => !isBootScreen());
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
