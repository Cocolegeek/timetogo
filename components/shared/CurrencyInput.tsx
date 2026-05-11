"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number | "";
  onChange: (value: number | "") => void;
  currency?: string;
  className?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, currency = "€", className, ...props }, ref) => {
    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm pointer-events-none">
          {currency}
        </span>
        <input
          ref={ref}
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange("");
            } else {
              const num = parseFloat(raw);
              if (!isNaN(num)) onChange(num);
            }
          }}
          className={cn(
            "w-full pl-8 pr-3 py-2.5 rounded-xl bg-foreground/8 border border-foreground/10 text-slate-100 text-sm",
            "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-section focus:border-section",
            "transition-all duration-200",
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
