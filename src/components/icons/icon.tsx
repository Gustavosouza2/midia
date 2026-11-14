// Icons from the prototypes (design/screens), stroked in the text color.
import type { ReactNode } from "react";

export function Icon({ size = 15, weight = 2, children }: { size?: number; weight?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
