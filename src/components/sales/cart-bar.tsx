"use client";

import { ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatBRL, plural } from "@/lib/format";

/**
 * Phone and tablet: while the order has items, a bar above the tab bar shows the count and total;
 * "Cobrar" opens the order panel in a bottom sheet.
 */
export function CartBar({
  items,
  total,
  open,
  onOpenChange,
  children,
}: {
  items: number;
  total: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {items > 0 && (
        <div className="fixed inset-x-3 bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 rounded-[14px] bg-primary py-2 pr-2 pl-4 text-primary-foreground shadow-[0_8px_24px_rgba(17,17,19,0.25)] animate-in duration-200 fade-in slide-in-from-bottom-2 tablet:inset-x-auto tablet:right-6 tablet:bottom-6 tablet:w-[360px]">
          <div className="flex min-w-0 flex-1 flex-col leading-[1.2]">
            <span className="text-[11px] opacity-70">{plural(items, "item", "itens")}</span>
            <strong className="text-base font-semibold tabular-nums">{formatBRL(total)}</strong>
          </div>
          <Button
            variant="outline"
            onClick={() => onOpenChange(true)}
            className="h-11 rounded-[10px] border-0 px-5 text-[13px] font-semibold"
          >
            Cobrar
            <ChevronUp className="size-4" />
          </Button>
        </div>
      )}
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Pedido</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
