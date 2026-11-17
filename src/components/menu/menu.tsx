"use client";

import { startTransition, useState } from "react";
import { readLocalDb } from "@/local-db/read-local-db";
import { useLocalQuery } from "@/local-db/use-local-query";
import { buildMenu, menuDay } from "@/lib/menu";
import { activeDays } from "@/lib/days";
import { shortDate } from "@/lib/format";
import { PageHeader } from "../page-header";
import { OpenToday } from "../day/open-today";
import { SmoothSwap } from "../transitions/smooth-swap";
import { DayPicker } from "../day/day-picker";
import { ItemsWithoutDay } from "./items-without-day";
import { ItemList } from "./item-list";

const SUBTITLE = "O que a cantina vende e o preço em cada dia.";

export function Menu() {
  const data = useLocalQuery(readLocalDb);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const selectDay = (id: string) => startTransition(() => setPickedId(id));

  if (!data) {
    return (
      <>
        <PageHeader title="Cardápio" subtitle={SUBTITLE} />
        <p className="text-[11px] text-muted-foreground" role="status">
          Carregando…
        </p>
      </>
    );
  }

  const days = activeDays(data.days);
  const day = menuDay(days, data.today, pickedId);
  const products = data.products
    .filter((p) => p.active)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const hasItems = products.length > 0;

  return (
    <>
      <PageHeader title="Cardápio" subtitle={SUBTITLE}>
        {(hasItems || days.length > 0) && (
          <DayPicker days={days} today={data.today} dayId={day?.id ?? ""} onSelect={selectDay} />
        )}
      </PageHeader>

      {day ? (
        <SmoothSwap>
          <ItemList key={day.id} day={day} menu={buildMenu(data, day.id)} />
        </SmoothSwap>
      ) : (
        <>
          {hasItems && (
            <OpenToday
              days={days}
              today={data.today}
              onSelectDay={selectDay}
              description={(copyFrom) =>
                copyFrom
                  ? `Copia os itens e preços de ${shortDate(copyFrom.date)}. Depois é só ajustar aqui.`
                  : "Os itens cadastrados entram à venda com o preço padrão."
              }
            />
          )}
          {(days.length === 0 || !hasItems) && <ItemsWithoutDay products={products} />}
        </>
      )}
    </>
  );
}
