"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartLine } from "@/lib/cart";
import { formatBRL } from "@/lib/format";

export function CartLineRow({ line, onQuantity }: { line: CartLine; onQuantity: (quantity: number) => void }) {
  const full = line.remaining !== null && line.quantity >= line.remaining;
  return (
    <li aria-label={line.name} className="flex items-center gap-2.5 py-2 animate-in duration-200 fade-in">
      <div className="flex min-w-0 flex-1 flex-col leading-[1.3]">
        <span className="truncate font-medium">{line.name}</span>
        <span className="text-[11px] text-muted-foreground">{formatBRL(line.priceCents)} cada</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={line.quantity === 1 ? `Tirar ${line.name}` : `Diminuir ${line.name}`}
          onClick={() => onQuantity(line.quantity - 1)}
          className="size-9 tablet:size-[30px]"
        >
          <Minus className="size-3.5" />
        </Button>
        <span aria-label="Quantidade" className="w-6 text-center font-semibold tabular-nums">
          {line.quantity}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={`Aumentar ${line.name}`}
          disabled={full}
          onClick={() => onQuantity(line.quantity + 1)}
          className="size-9 tablet:size-[30px]"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
      <span className="w-16 text-right font-semibold tabular-nums">{formatBRL(line.amount)}</span>
    </li>
  );
}
