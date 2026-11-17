"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { plural } from "@/lib/format";
import type { StatusFilter, SalesScreen } from "@/lib/sales";
import { OrderList } from "./order-list";

const FILTERS: [StatusFilter, string][] = [
  ["all", "Todos"],
  ["pending", "Pendentes"],
  ["reserved", "Reservas"],
  ["paid", "Pagos"],
];

export function DayOrders({
  screen,
  search,
  onSearch,
  filter,
  onFilter,
}: {
  screen: SalesScreen;
  search: string;
  onSearch: (search: string) => void;
  filter: StatusFilter;
  onFilter: (filter: StatusFilter) => void;
}) {
  const count = screen.orders.length;

  const emptyMessage = search.trim()
    ? "Ninguém com esse nome neste dia."
    : screen.dayTotal === 0
      ? "Nada por aqui ainda. Registre a primeira venda ou reserva."
      : "Nenhum pedido com esse status.";

  return (
    <section aria-labelledby="day-orders" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 id="day-orders" className="text-sm font-semibold">
            Pedidos do dia
          </h2>
          <span className="text-[11px] text-muted-foreground">{plural(count, "pedido", "pedidos")}</span>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 tablet:w-auto">
          <div className="relative w-full tablet:w-[220px]">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="Buscar cliente"
              placeholder="Buscar cliente"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className="bg-background pl-8 tablet:h-9"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => onFilter(v as StatusFilter)}>
            <TabsList aria-label="Status">
              {FILTERS.map(([value, label]) => (
                <TabsTrigger key={value} value={value} aria-label={label}>
                  {label}
                  <span className="ml-1 tabular-nums opacity-60">{screen.counts[value]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <OrderList key={`${filter}|${search}`} orders={screen.orders} emptyMessage={emptyMessage} />
    </section>
  );
}
