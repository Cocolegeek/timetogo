import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "strong" | "subtle";
  padding?: boolean;
}

export function GlassCard({
  children,
  className,
  variant = "default",
  padding = true,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl shadow-2xl shadow-black/40",
        variant === "default" && "glass",
        variant === "strong" && "glass-strong",
        variant === "subtle" && "glass-subtle",
        padding && "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}
