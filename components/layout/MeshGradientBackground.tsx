"use client";

import { motion } from "framer-motion";

export function MeshGradientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-950">
      {/* Orb 1 — indigo top-left */}
      <motion.div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full"
        style={{
          background:
            "radial-gradient(circle, oklch(0.45 0.22 264 / 40%) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orb 2 — violet top-right */}
      <motion.div
        className="absolute -top-16 right-0 w-[500px] h-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, oklch(0.40 0.28 295 / 30%) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
        animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orb 3 — indigo bottom-center */}
      <motion.div
        className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full"
        style={{
          background:
            "radial-gradient(circle, oklch(0.50 0.20 264 / 20%) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
        animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
}
