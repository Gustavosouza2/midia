import type { ReactNode } from "react";

/** Rótulo de um grupo (segmentado, Qtd), ligado por aria-labelledby. */
export function Campo({ rotulo, id, children }: { rotulo: string; id: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span id={id} className="text-[11px] text-muted-foreground">
        {rotulo}
      </span>
      {children}
    </div>
  );
}
