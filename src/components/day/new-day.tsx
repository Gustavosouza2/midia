"use client";

import type { ReactElement } from "react";
import { Popover, PopoverAnchor, PopoverContent, PopoverTitle } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { SaleDay } from "@/local-db";
import { NewDayForm } from "./new-day-form";
import { useTablet } from "./use-tablet";

const TITLE = "Novo dia de venda";

/**
 * "Novo dia de venda" (DESIGN.md, "Creating a day"). On tablet and desktop it opens a popover anchored
 * to `children`; on the phone, a bottom sheet. On create, or on "Abrir esse dia"
 * when the date already exists, it closes and calls `onSelectDay` with the id.
 */
export function NewDay({
  days,
  today,
  open,
  onOpenChange,
  onSelectDay,
  children,
}: {
  /** Active days (activeDays()), for the suggested date, the duplicate date and "Copiar de". */
  days: SaleDay[];
  today: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDay: (dayId: string) => void;
  children: ReactElement;
}) {
  const tablet = useTablet();
  const form = (
    <NewDayForm
      days={days}
      today={today}
      onCancel={() => onOpenChange(false)}
      onSelectDay={(id) => {
        onOpenChange(false);
        onSelectDay(id);
      }}
    />
  );

  return (
    <>
      <Popover open={open && tablet} onOpenChange={onOpenChange}>
        <PopoverAnchor asChild>{children}</PopoverAnchor>
        <PopoverContent align="start" aria-label={TITLE} className="flex w-80 flex-col gap-3">
          <PopoverTitle>{TITLE}</PopoverTitle>
          {form}
        </PopoverContent>
      </Popover>
      <Sheet open={open && !tablet} onOpenChange={onOpenChange}>
        <SheetContent aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>{TITLE}</SheetTitle>
          </SheetHeader>
          {form}
        </SheetContent>
      </Sheet>
    </>
  );
}
