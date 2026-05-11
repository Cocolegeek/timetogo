"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Sticky back-to-home bar used on trip child pages (Budget / Planning / Menus).
 *
 * Stays anchored just below the device safe area so it remains reachable even
 * when the page auto-scrolls down (e.g. to today's section on Planning/Menus).
 * The glass blur lets the content scrolling beneath be perceptible.
 */
export function BackHomeBar() {
  return (
    <div
      className="sticky z-20 -mx-4 px-4 py-1.5 mb-2 glass-strong border-b border-foreground/8"
      style={{ top: "env(safe-area-inset-top)" }}
    >
      <Link
        href="/trips"
        className="inline-flex items-center justify-center p-2 -ml-2 rounded-xl hover:bg-foreground/8 active:bg-foreground/12 text-slate-400 hover:text-slate-200 transition-all"
        aria-label="Retour à l'accueil"
      >
        <ArrowLeft size={20} />
      </Link>
    </div>
  );
}
