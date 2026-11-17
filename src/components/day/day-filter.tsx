"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { startTransition, useOptimistic, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { SaleDay } from "@/local-db";
import { dayTag, neighbors } from "@/lib/days";
import { DayList } from "./day-list";
import { DayLabel } from "./day-label";
import { useTablet } from "./use-tablet";

const TITLE = "Escolher dia";
const ARROW = "size-11 flex-none rounded-[10px] tablet:size-[34px] tablet:rounded-lg";

/**
 * Sale day filter for the four screens (DESIGN.md, "Sale days"): ‹ [day ▾] ›. The trigger
 * opens the full list in a popover (tablet and desktop) or in a sheet (phone).
 * `days` comes from activeDays(); `value` is the day id or "all".
 */
export function DayFilter({
  days,
  today,
  value,
  onSelect,
  label,
  all = false,
  onNewDay,
}: {
  days: SaleDay[];
  today: string;
  value: string;
  onSelect: (value: string) => void;
  /** Group name for screen readers ("Período", "Dia de venda"). */
  label: string;
  /** Dashboard and Pending: "Todos os dias" at the top of the list. */
  all?: boolean;
  /** Sales and Menu: "+ Novo dia de venda" at the bottom of the list. */
  onNewDay?: () => void;
}) {
  const emptyLabel = all ? "Todos os dias" : "Escolher outro dia";
  const tablet = useTablet();
  const [open, setOpen] = useState(false);
  // When the list is swapped for "Novo dia", focus does not return to the trigger: that would close the form that just opened.
  const goingToNewDay = useRef(false);
  // The screen switches day in a transition; the filter already shows the new day, and repeated taps on the arrow move one day each.
  const [shown, show] = useOptimistic(value);
  const day = days.find((d) => d.id === shown);
  const { previous, next } = neighbors(days, shown);

  const select = (next: string) => {
    setOpen(false);
    startTransition(() => {
      show(next);
      onSelect(next);
    });
  };
  const restoreFocus = (event: Event) => {
    if (goingToNewDay.current) event.preventDefault();
    goingToNewDay.current = false;
  };
  const list = (
    <DayList
      days={days}
      today={today}
      value={shown}
      onSelect={select}
      all={all}
      onNewDay={
        onNewDay &&
        (() => {
          goingToNewDay.current = true;
          setOpen(false);
          onNewDay();
        })
      }
    />
  );

  return (
    <div role="group" aria-label={label} className="flex w-full min-w-0 items-center gap-2 tablet:w-auto tablet:gap-1.5">
      {day && (
        <Button
          variant="outline"
          size="icon"
          aria-label="Dia anterior"
          disabled={!previous}
          onClick={() => previous && select(previous.id)}
          className={ARROW}
        >
          <ChevronLeft className="size-4" />
        </Button>
      )}

      <Popover open={open && tablet} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            aria-expanded={open}
            className="h-11 min-w-0 flex-1 justify-start gap-2 text-left rounded-[10px] px-3 text-[13px] tablet:h-[34px] tablet:w-72 tablet:flex-none tablet:rounded-lg tablet:px-2.5 tablet:text-xs"
          >
            <CalendarDays aria-hidden="true" className="size-4 text-muted-foreground tablet:size-3.5" />
            <span className="min-w-0 flex-1">
              {day ? (
                <DayLabel day={day} tag={dayTag(day, days, today)} />
              ) : (
                <span className="font-medium">{emptyLabel}</span>
              )}
            </span>
            <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground tablet:size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          aria-label={TITLE}
          onCloseAutoFocus={restoreFocus}
          className="flex max-h-[min(380px,var(--radix-popover-content-available-height))] w-80 flex-col p-1.5"
        >
          {list}
        </PopoverContent>
      </Popover>

      {day && (
        <Button
          variant="outline"
          size="icon"
          aria-label="Dia seguinte"
          disabled={!next}
          onClick={() => next && select(next.id)}
          className={ARROW}
        >
          <ChevronRight className="size-4" />
        </Button>
      )}

      <Sheet open={open && !tablet} onOpenChange={setOpen}>
        <SheetContent aria-describedby={undefined} onCloseAutoFocus={restoreFocus} className="overflow-hidden">
          <SheetHeader>
            <SheetTitle>{TITLE}</SheetTitle>
          </SheetHeader>
          {list}
        </SheetContent>
      </Sheet>
    </div>
  );
}
