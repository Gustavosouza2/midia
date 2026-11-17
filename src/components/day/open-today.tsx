"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLocalDb, type SaleDay } from "@/local-db";
import { createDay, WriteError } from "@/local-db/writes";
import { menuToCopy } from "@/lib/days";
import { shortDate } from "@/lib/format";

/**
 * Today has no sale day yet: one tap opens it with the latest day's menu (or the default prices on the
 * first day ever). Other dates stay in the day filter's "+ Novo dia de venda".
 */
export function OpenToday({
  days,
  today,
  onSelectDay,
  description,
}: {
  /** activeDays() order. */
  days: SaleDay[];
  today: string;
  onSelectDay: (dayId: string) => void;
  /** Screen-specific explanation, given the day whose menu is copied (null = default prices). */
  description?: (copyFrom: SaleDay | null) => string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const source = menuToCopy(days, today);
  const copyFrom = (source.type === "copy" && days.find((d) => d.id === source.dayId)) || null;

  async function open() {
    setOpening(true);
    setError(null);
    try {
      onSelectDay(await createDay(getLocalDb(), { date: today, menu: source }));
    } catch (e) {
      setError(e instanceof WriteError ? e.message : "Não foi possível abrir o dia.");
      setOpening(false);
    }
  }

  return (
    <Card className="items-center gap-1 px-6 py-10 text-center">
      <h2 className="text-base font-semibold">Vendas de hoje ainda não abertas</h2>
      <p className="max-w-[420px] text-xs text-muted-foreground">
        {description?.(copyFrom) ??
          (copyFrom
            ? `O cardápio e os preços vêm do dia ${shortDate(copyFrom.date)}. Dá para ajustar depois no Cardápio.`
            : "Todos os itens do Cardápio entram à venda com o preço padrão.")}
      </p>
      <Button size="lg" className="mt-4 min-w-[220px]" disabled={opening} onClick={open}>
        Abrir vendas de hoje
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-warn">
          {error}
        </p>
      )}
    </Card>
  );
}
