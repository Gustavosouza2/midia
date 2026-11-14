import type { ReactNode } from "react";

/** Label of a group (segmented, Qtd), linked by aria-labelledby. */
export function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span id={id} className="text-[11px] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
