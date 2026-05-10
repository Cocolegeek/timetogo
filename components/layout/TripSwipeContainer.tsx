"use client";

import { type CSSProperties, type ReactNode } from "react";

interface TripSwipeContainerProps {
  tripId?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function TripSwipeContainer({
  className,
  style,
  children,
}: TripSwipeContainerProps) {
  return (
    <main className={className} style={style}>
      {children}
    </main>
  );
}
