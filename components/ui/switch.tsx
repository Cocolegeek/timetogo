"use client";

import { motion } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  className?: string;
}

/** iOS-style switch. `label` is for screen readers (the row shows the visible text). */
export function Switch({ checked, onCheckedChange, disabled, label, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        haptic("light");
        onCheckedChange(!checked);
      }}
      className={cn(
        "relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
        checked ? "bg-emerald-500" : "bg-foreground/[0.14]",
        className
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 600, damping: 38 }}
        className={cn("block size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)]", checked && "ml-auto")}
      />
    </button>
  );
}
