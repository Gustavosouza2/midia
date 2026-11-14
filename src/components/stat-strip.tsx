import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

/**
 * Card split into 4 columns (2×2 below the `wide` breakpoint). The dividers are the `border`
 * background showing through `gap-px`, so they work for any column arrangement.
 */
export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <Card className="grid grid-cols-2 gap-px bg-border wide:grid-cols-4">{children}</Card>
  );
}
