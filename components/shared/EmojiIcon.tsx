"use client";

import { useState } from "react";
import { isFlagEmoji } from "@/lib/trip-emojis";

const REGIONAL_A = 0x1f1e6;

function countryOf(flag: string): string {
  return [...flag].map((c) => String.fromCharCode(97 + (c.codePointAt(0) as number) - REGIONAL_A)).join("");
}

export function EmojiIcon({ emoji, className }: { emoji: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!isFlagEmoji(emoji) || failed) return <span className={className}>{emoji}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flags/${countryOf(emoji)}.svg`}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      className="inline-block h-[0.78em] w-auto -translate-y-[0.04em] rounded-[0.12em] align-middle shadow-[0_0_0_1px_rgb(0_0_0/0.12)]"
    />
  );
}
