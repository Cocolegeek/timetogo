import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-20", className)}>
      <div
        className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{
          borderColor: "var(--accent-border)",
          borderTopColor: "var(--accent-400)",
        }}
      />
    </div>
  );
}
