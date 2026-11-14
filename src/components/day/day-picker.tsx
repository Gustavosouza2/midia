"use client";

import { useState } from "react";
import type { SaleDay } from "@/local-db";
import { DayFilter } from "./day-filter";
import { NewDay } from "./new-day";

/**
 * Day filter for Sales and Menu, with "+ Novo dia de venda" at the bottom of the list.
 * `days` comes from activeDays(); the screen keeps the selected day and starts at initialDay().
 */
export function DayPicker({
  days,
  today,
  dayId,
  onSelect,
}: {
  days: SaleDay[];
  today: string;
  dayId: string;
  onSelect: (dayId: string) => void;
}) {
  const [newOpen, setNewOpen] = useState(false);

  return (
    <NewDay days={days} today={today} open={newOpen} onOpenChange={setNewOpen} onSelectDay={onSelect}>
      <div className="flex min-w-0">
        <DayFilter
          days={days}
          today={today}
          value={dayId}
          onSelect={onSelect}
          label="Dia de venda"
          onNewDay={() => setNewOpen(true)}
        />
      </div>
    </NewDay>
  );
}
