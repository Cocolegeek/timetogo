"use client";

import { motion } from "framer-motion";

export function MeshGradientBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{ backgroundColor: "var(--mesh-bg)" }}
    >
      {/* Orb 1 — top-left (indigo) */}
      <motion.div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--mesh-orb-1) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orb 2 — top-right (violet) */}
      <motion.div
        className="absolute -top-16 right-0 w-[500px] h-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--mesh-orb-2) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
        animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orb 3 — bottom-center (sky / indigo accent) */}
      <motion.div
        className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--mesh-orb-3) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
        animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Subtle grid overlay — colour swaps via --mesh-grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(var(--mesh-grid) 1px, transparent 1px), linear-gradient(90deg, var(--mesh-grid) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
}
