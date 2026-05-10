import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-20", className)}>
      <div className="w-8 h-8 rounded-full border-2 border-indigo-500/50 border-t-indigo-400 animate-spin" />
    </div>
  );
}
