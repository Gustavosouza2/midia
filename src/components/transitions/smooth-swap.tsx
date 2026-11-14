import { ViewTransition, type ReactNode } from "react";

/**
 * Crossfades the old content with the new when it changes inside a startTransition
 * (switching day or period). Ordinary state changes do not animate.
 */
export function SmoothSwap({ children }: { children: ReactNode }) {
  return (
    <ViewTransition update="swap" default="none">
      {children}
    </ViewTransition>
  );
}
