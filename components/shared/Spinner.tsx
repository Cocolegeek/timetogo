import { PageSkeleton } from "@/components/shared/Skeleton";
import { cn } from "@/lib/utils";

/** Page-level loading placeholder (kept under its historical name). */
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("py-2", className)}>
      <PageSkeleton />
    </div>
  );
}
