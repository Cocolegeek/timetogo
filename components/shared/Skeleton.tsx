import { cn } from "@/lib/utils";
import { VoyouLoader } from "@/components/shared/VoyouLoader";

/** Beyond this wait, the hopping face takes over from the grey blocks. */
const TAKEOVER_MS = 1500;

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-skeleton rounded-2xl bg-foreground/[0.06]", className)} />;
}

/**
 * Generic page placeholder: the screen's shape at once (large title + cards);
 * if loading drags on (first launch, slow network), the blocks step back and
 * the « oyo » face hops in the middle of the screen with a few words.
 */
export function PageSkeleton() {
  return (
    <div className="pt-2">
      <div aria-hidden="true" className="vl-recede space-y-4" style={{ "--vl-delay": `${TAKEOVER_MS}ms` } as React.CSSProperties}>
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-9 w-48 rounded-xl" />
        <Skeleton className="h-40 w-full rounded-[1.5rem]" />
        <Skeleton className="h-20 w-full rounded-[1.5rem]" />
        <Skeleton className="h-20 w-full rounded-[1.5rem]" />
      </div>
      <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center px-6">
        <VoyouLoader delay={TAKEOVER_MS} />
      </div>
    </div>
  );
}
