"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { MenuItem } from "@/lib/sales";
import { OrderForm } from "./order-form";

/** Phone: floating "Nova venda" button that opens the form in a bottom sheet. */
export function MobileNewSale({ dayId, menu }: { dayId: string; menu: MenuItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="fixed right-4 bottom-[calc(92px+env(safe-area-inset-bottom))] z-20 h-12 rounded-[14px] px-[18px] text-[13px] shadow-[0_8px_24px_rgba(17,17,19,0.25)] tablet:hidden">
          <Plus className="size-4" />
          Nova venda
        </Button>
      </SheetTrigger>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Novo pedido</SheetTitle>
        </SheetHeader>
        <OrderForm dayId={dayId} menu={menu} layout="sheet" onSubmitted={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
