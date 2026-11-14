"use client";

import Link from "next/link";
import { startTransition, useMemo, useState } from "react";
import { readLocalDb } from "@/local-db/read-local-db";
import { useLocalQuery } from "@/local-db/use-local-query";
import { initialDay, activeDays, dayTag } from "@/lib/days";
import { longDate } from "@/lib/format";
import { buildSales, type StatusFilter } from "@/lib/sales";
import { FirstDay } from "../day/first-day";
import { SmoothSwap } from "../transitions/smooth-swap";
import { RemoveDay } from "../day/remove-day";
import { DayPicker } from "../day/day-picker";
import { SalesIcon } from "../icons/sales-icon";
import { Breadcrumb } from "../breadcrumb";
import { StartWithMenu } from "./start-with-menu";
import { OrderForm } from "./order-form";
import { MobileNewSale } from "./mobile-new-sale";
import { SalesStats } from "./sales-stats";
import { DayOrders } from "./day-orders";


export function Sales() {
  const data = useLocalQuery(readLocalDb);
  const [dayId, setDayId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const days = useMemo(() => (data ? activeDays(data.days) : []), [data]);
  const day = data ? (days.find((d) => d.id === dayId) ?? initialDay(days, data.today)) : null;
  const screen = useMemo(
    () => data && day && buildSales(data, day.id, { search, filter }),
    [data, day, search, filter],
  );

  function selectDay(id: string) {
    startTransition(() => {
      setDayId(id);
      setSearch("");
      setFilter("all");
    });
  }

  const breadcrumb = <Breadcrumb Icon={SalesIcon} title="Vendas" />;

  if (!data) {
    return (
      <>
        {breadcrumb}
        <p className="text-[11px] text-muted-foreground" role="status">
          Carregando…
        </p>
      </>
    );
  }

  if (!day || !screen) {
    return (
      <>
        {breadcrumb}
        <h1 className="text-xl leading-[1.2] font-semibold tracking-[-0.02em] tablet:text-[26px]">Vendas</h1>
        {data.products.some((p) => p.active) ? (
          <FirstDay today={data.today} onSelectDay={selectDay} />
        ) : (
          <StartWithMenu />
        )}
      </>
    );
  }

  const tag = dayTag(day, days, data.today);

  return (
    <>
      {breadcrumb}

      <section className="flex flex-col gap-3 desk:flex-row desk:flex-wrap desk:items-end desk:justify-between desk:gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl leading-[1.2] font-semibold tracking-[-0.02em] tablet:text-[26px]">Vendas</h1>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span>
              {longDate(day.date)}
              {tag === "hoje" ? " · hoje" : tag === "próximo" ? " · próximo dia de venda" : ""}
            </span>
            ·
            <Link transitionTypes={["screen"]} href="/menu" className="text-foreground underline underline-offset-[3px]">
              preços no Cardápio
            </Link>
            <RemoveDay day={day} />
          </p>
        </div>
        <DayPicker days={days} today={data.today} dayId={day.id} onSelect={selectDay} />
      </section>

      <div className="hidden tablet:block">
        <OrderForm key={day.id} dayId={day.id} menu={screen.menu} layout="row" />
      </div>

      <SmoothSwap>
        <SalesStats stats={screen.stats} />

        <DayOrders
          key={day.id}
          screen={screen}
          search={search}
          onSearch={setSearch}
          filter={filter}
          onFilter={setFilter}
        />
      </SmoothSwap>

      <MobileNewSale dayId={day.id} menu={screen.menu} />
    </>
  );
}
