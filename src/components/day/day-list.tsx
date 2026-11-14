"use client";

import { Check, Plus } from "lucide-react";
import type { SaleDay } from "@/local-db";
import { groupByMonth, dayTag } from "@/lib/days";
import { DayLabel } from "./day-label";

const ITEM =
  "flex h-12 w-full flex-none items-center gap-2 rounded-lg px-2.5 text-left text-[13px] text-text-2 outline-none hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring aria-pressed:bg-accent tablet:h-10 tablet:text-xs";

/** Content of the DayFilter popover/sheet: "Todos os dias", the days grouped by month and "+ Novo dia de venda". */
export function DayList({
  days,
  today,
  value,
  onSelect,
  all,
  onNewDay,
}: {
  days: SaleDay[];
  today: string;
  value: string;
  onSelect: (value: string) => void;
  all: boolean;
  onNewDay?: () => void;
}) {
  // On open, the list already shows the selected day, even if it is at the end.
  function scrollToSelected(scroller: HTMLDivElement | null) {
    const item = scroller?.querySelector<HTMLElement>("[aria-pressed=true]");
    if (scroller && item) scroller.scrollTop = item.offsetTop - (scroller.clientHeight - item.offsetHeight) / 2;
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div ref={scrollToSelected} className="relative -mx-1 flex min-h-0 flex-col overflow-y-auto px-1">
        {all && (
          <button type="button" aria-pressed={value === "all"} onClick={() => onSelect("all")} className={ITEM}>
            <span className="flex-1 font-medium text-foreground">Todos os dias</span>
            {value === "all" && <Check aria-hidden="true" className="size-4 flex-none text-foreground" />}
          </button>
        )}
        {groupByMonth(days).map(([month, inMonth]) => (
          <div key={month} role="group" aria-label={month} className="flex flex-col">
            <span className="px-2.5 pt-3 pb-1 text-[11px] text-muted-foreground">{month}</span>
            {inMonth.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={d.id === value}
                onClick={() => onSelect(d.id)}
                className={ITEM}
              >
                <span className="min-w-0 flex-1">
                  <DayLabel day={d} tag={dayTag(d, days, today)} />
                </span>
                {d.id === value && <Check aria-hidden="true" className="size-4 flex-none text-foreground" />}
              </button>
            ))}
          </div>
        ))}
      </div>
      {onNewDay && (
        <div className="-mx-1 mt-1 border-t border-border px-1 pt-1">
          <button type="button" onClick={onNewDay} className={`${ITEM} font-medium text-foreground`}>
            <Plus aria-hidden="true" className="size-4 flex-none" />
            Novo dia de venda
          </button>
        </div>
      )}
    </div>
  );
}
