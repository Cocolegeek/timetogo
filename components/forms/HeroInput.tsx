"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/** Le champ qu'on remplit en premier : grand, sans cadre, souligné. Les autres réglages passent par des puces. */
export const HeroInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function HeroInput(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      {...props}
      className={cn(
        "block w-full border-0 border-b-2 border-foreground/10 bg-transparent px-0 py-2.5 font-display text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-foreground outline-none transition-colors",
        "placeholder:font-semibold placeholder:text-muted-foreground/50 focus:border-foreground [&:not(:placeholder-shown)]:border-foreground/30",
        className
      )}
    />
  );
});
