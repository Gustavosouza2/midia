"use client";

import { Search } from "lucide-react";
import { DayFilter } from "@/components/day/day-filter";
import { Input } from "@/components/ui/input";
import type { SaleDay } from "@/local-db";
import type { Period } from "@/lib/dashboard";

/** Day filter (filter only: no "+ Novo dia de venda") and the person search. */
export function PendingFilter({
  days,
  today,
  period,
  onSelect,
  search,
  onSearch,
}: {
  days: SaleDay[];
  today: string;
  period: Period;
  onSelect: (period: Period) => void;
  search: string;
  onSearch: (search: string) => void;
}) {
  return (
    <div className="contents tablet:order-1 tablet:flex tablet:flex-wrap tablet:items-center tablet:justify-between tablet:gap-3">
      <div className="order-1 min-w-0">
        <DayFilter days={days} today={today} value={period} onSelect={onSelect} label="Dia de venda" all />
      </div>

      <div className="relative order-3 tablet:w-60 tablet:max-w-full">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground tablet:left-2.5 tablet:size-3.5"
        />
        <Input
          type="search"
          aria-label="Buscar pessoa"
          placeholder="Buscar pessoa"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="bg-background pl-9 tablet:pl-8"
        />
      </div>
    </div>
  );
}
