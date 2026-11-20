import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-skeleton rounded-2xl bg-foreground/[0.06]", className)} />;
}

/** Generic page placeholder: large title + a few cards. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Chargement" className="space-y-4 pt-2">
      <Skeleton className="h-4 w-28 rounded-full" />
      <Skeleton className="h-9 w-48 rounded-xl" />
      <Skeleton className="h-40 w-full rounded-[1.5rem]" />
      <Skeleton className="h-20 w-full rounded-[1.5rem]" />
      <Skeleton className="h-20 w-full rounded-[1.5rem]" />
    </div>
  );
}
