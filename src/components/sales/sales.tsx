"use client";

import { startTransition, useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { readLocalDb } from "@/local-db/read-local-db";
import { useLocalQuery } from "@/local-db/use-local-query";
import { addToCart, cartLines, cartTotal } from "@/lib/cart";
import { activeDays, dayTag } from "@/lib/days";
import { EMPTY_DRAFT, type Draft } from "@/lib/draft";
import { longDate } from "@/lib/format";
import { buildSales, type StatusFilter } from "@/lib/sales";
import { OpenToday } from "../day/open-today";
import { RemoveDay } from "../day/remove-day";
import { DayPicker } from "../day/day-picker";
import { PageHeader } from "../page-header";
import { SmoothSwap } from "../transitions/smooth-swap";
import { useDesk } from "../use-desk";
import { StartWithMenu } from "./start-with-menu";
import { ProductGrid } from "./product-grid";
import { Checkout, type Placed } from "./checkout";
import { CartBar } from "./cart-bar";
import { PlacedToast } from "./placed-toast";
import { DaySummary } from "./day-summary";
import { DayOrders } from "./day-orders";

/**
 * The counter: tap the items, then tap how it is paid. Opens on today's sale day; when today has none,
 * one tap opens it. Desktop keeps the order panel beside the items; phone and tablet open it from a bar.
 */
export function Sales() {
  const data = useLocalQuery(readLocalDb);
  const desk = useDesk();
  const [dayId, setDayId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [placed, setPlaced] = useState<Placed | null>(null);

  const days = useMemo(() => (data ? activeDays(data.days) : []), [data]);
  const day = data
    ? (days.find((d) => d.id === dayId) ?? (dayId ? null : days.find((d) => d.date === data.today)) ?? null)
    : null;
  const screen = useMemo(
    () => data && day && buildSales(data, day.id, { search, filter }),
    [data, day, search, filter],
  );
  const customers = useMemo(
    () => [...new Set((data?.customers ?? []).map((c) => c.name))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [data],
  );
  const dismissPlaced = useCallback(() => setPlaced(null), []);

  function selectDay(id: string) {
    startTransition(() => {
      setDayId(id);
      setSearch("");
      setFilter("all");
      setDraft(EMPTY_DRAFT);
    });
  }

  if (!data) {
    return (
      <p className="text-[11px] text-muted-foreground" role="status">
        Carregando…
      </p>
    );
  }

  const tag = day && dayTag(day, days, data.today);
  const header = (
    <PageHeader
      title="Vendas"
      subtitle={
        day && (
          <>
            <span>
              {longDate(day.date)}
              {tag === "hoje" ? " · hoje" : tag === "próximo" ? " · próximo dia de venda" : ""}
            </span>
            <RemoveDay day={day} />
          </>
        )
      }
    >
      {days.length > 0 && <DayPicker days={days} today={data.today} dayId={day?.id ?? null} onSelect={selectDay} />}
    </PageHeader>
  );

  if (!day || !screen) {
    return (
      <>
        {header}
        {!data.products.some((p) => p.active) ? (
          <StartWithMenu />
        ) : (
          <OpenToday days={days} today={data.today} onSelectDay={selectDay} />
        )}
      </>
    );
  }

  const lines = cartLines(draft.cart, screen.menu);
  const items = lines.reduce((sum, l) => sum + l.quantity, 0);
  const checkout = (
    <Checkout
      key={day.id}
      dayId={day.id}
      menu={screen.menu}
      customers={customers}
      draft={draft}
      onChange={setDraft}
      onPlaced={(result) => {
        setDraft(EMPTY_DRAFT);
        setSheetOpen(false);
        setPlaced(result);
      }}
    />
  );

  return (
    <>
      {header}

      <div className="grid items-start gap-4 desk:grid-cols-[minmax(0,1fr)_340px] desk:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          <ProductGrid
            menu={screen.menu}
            cart={draft.cart}
            onAdd={(productId) => {
              setPlaced(null);
              setDraft((current) => ({ ...current, cart: addToCart(current.cart, screen.menu, productId) }));
            }}
          />

          <SmoothSwap>
            <div className="flex flex-col gap-4">
              <DaySummary stats={screen.stats} />
              <DayOrders
                key={day.id}
                screen={screen}
                search={search}
                onSearch={setSearch}
                filter={filter}
                onFilter={setFilter}
              />
            </div>
          </SmoothSwap>
        </div>

        {desk ? (
          <Card className="sticky top-4 p-4">{checkout}</Card>
        ) : (
          <>
            {/* Room for the bar, so it never covers the last order. */}
            {items > 0 && <div aria-hidden="true" className="h-20" />}
            <CartBar items={items} total={cartTotal(lines)} open={sheetOpen} onOpenChange={setSheetOpen}>
              {checkout}
            </CartBar>
          </>
        )}
      </div>

      {placed && (
        <PlacedToast
          placed={placed}
          onDismiss={dismissPlaced}
          onUndone={(undone) => {
            setPlaced(null);
            setDraft(undone.draft);
          }}
        />
      )}
    </>
  );
}
