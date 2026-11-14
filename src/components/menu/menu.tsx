"use client";

import { Plus } from "lucide-react";
import { startTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { readLocalDb } from "@/local-db/read-local-db";
import { useLocalQuery } from "@/local-db/use-local-query";
import { buildMenu } from "@/lib/menu";
import { initialDay, activeDays } from "@/lib/days";
import { FirstDay } from "../day/first-day";
import { SmoothSwap } from "../transitions/smooth-swap";
import { DayPicker } from "../day/day-picker";
import { MenuIcon } from "../icons/menu-icon";
import { Breadcrumb } from "../breadcrumb";
import { ItemsWithoutDay } from "./items-without-day";
import { ItemList } from "./item-list";
import { NewItem } from "./new-item";
import { FirstItem } from "./first-item";


export function Menu() {
  const data = useLocalQuery(readLocalDb);
  const [dayId, setDayId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const selectDay = (id: string) => startTransition(() => setDayId(id));

  const addButton = (
    <Button onClick={() => setNewOpen(true)}>
      <Plus className="size-3.5" strokeWidth={2.4} />
      Adicionar item
    </Button>
  );

  if (!data) {
    return (
      <>
        <Breadcrumb Icon={MenuIcon} title="Cardápio" />
        <p className="text-[11px] text-muted-foreground" role="status">
          Carregando…
        </p>
      </>
    );
  }

  const days = activeDays(data.days);
  const day = days.find((d) => d.id === dayId) ?? initialDay(days, data.today);
  const activeProducts = data.products
    .filter((p) => p.active)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <>
      <Breadcrumb Icon={MenuIcon} title="Cardápio">
        {addButton}
      </Breadcrumb>

      <section className="flex flex-col gap-3 desk:flex-row desk:flex-wrap desk:items-end desk:justify-between desk:gap-4">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex max-w-[560px] flex-col gap-1">
            <h1 className="text-lg leading-[1.2] font-semibold tracking-[-0.02em] tablet:text-[26px]">Cardápio</h1>
            <span className="text-[11px] text-muted-foreground tablet:text-xs">
              O que a cantina vende e o preço de cada item em cada dia de venda.
            </span>
          </div>
          <Button
            onClick={() => setNewOpen(true)}
            aria-label="Adicionar item"
            className="h-9 flex-none rounded-[9px] tablet:hidden"
          >
            <Plus className="size-3.5" strokeWidth={2.4} />
            Item
          </Button>
        </div>
        {day && <DayPicker days={days} today={data.today} dayId={day.id} onSelect={selectDay} />}
      </section>

      {newOpen && <NewItem dayId={day?.id ?? null} onClose={() => setNewOpen(false)} />}

      {day ? (
        <SmoothSwap>
          <ItemList key={day.id} day={day} menu={buildMenu(data, day.id)} />
        </SmoothSwap>
      ) : activeProducts.length > 0 ? (
        <>
          <FirstDay
            today={data.today}
            onSelectDay={selectDay}
            description="Agora crie o primeiro dia de venda. Os itens cadastrados entram à venda nele com o preço padrão."
          />
          <ItemsWithoutDay products={activeProducts} />
        </>
      ) : (
        !newOpen && <FirstItem onAdd={() => setNewOpen(true)} />
      )}
    </>
  );
}
