"use client";

import { cn } from "cn";
import { formatBRL } from "@/lib/format";
import type { MenuItem } from "@/lib/sales";

/** One item of the day. A large target (Fitts) that shows how many are already in the order. */
export function ProductTile({ item, inCart, onAdd }: { item: MenuItem; inCart: number; onAdd: () => void }) {
  const left = item.remaining === null ? null : item.remaining - inCart;
  const soldOut = item.remaining === 0;
  const full = left !== null && left <= 0;

  return (
    <button
      type="button"
      disabled={soldOut || full}
      onClick={onAdd}
      aria-label={`Adicionar ${item.name}`}
      className={cn(
        "relative flex min-h-[84px] w-full flex-col items-start justify-between gap-2 rounded-xl border bg-background p-3 text-left transition-[background-color,border-color,transform] duration-150 outline-none select-none",
        "hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:active:scale-100",
        inCart > 0 ? "border-primary shadow-float" : "border-input",
      )}
    >
      <span className={cn("pr-7 text-[13px] leading-[1.25] font-semibold", soldOut && "text-muted-foreground")}>
        {item.name}
      </span>
      <span className="flex w-full items-baseline justify-between gap-2">
        <span className={cn("text-[15px] font-semibold tabular-nums", soldOut && "text-muted-foreground")}>
          {formatBRL(item.priceCents)}
        </span>
        {soldOut ? (
          <span className="text-[11px] font-medium text-warn">esgotado</span>
        ) : (
          left !== null && (
            <span className={cn("text-[11px] tabular-nums", left <= 3 ? "text-warn" : "text-muted-foreground")}>
              {left === 0 ? "acabou" : `restam ${left}`}
            </span>
          )
        )}
      </span>
      {inCart > 0 && (
        <span
          aria-label={`${inCart} no pedido`}
          className="absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground tabular-nums animate-in duration-200 zoom-in-50"
        >
          {inCart}
        </span>
      )}
    </button>
  );
}
