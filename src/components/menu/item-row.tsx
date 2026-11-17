"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { getLocalDb } from "@/local-db";
import { setOnMenu, WriteError } from "@/local-db/writes";
import type { MenuItem } from "@/lib/menu";
import { initials, plural } from "@/lib/format";
import { COLUMNS } from "./columns";
import { DayPrice } from "./day-price";
import { DayQuantity } from "./day-quantity";

/**
 * An item on the day's menu. Up to 1180px: a card with the switch at the top and the price and quantity
 * inputs side by side below (only when it is for sale). Above: a table row.
 */
export function ItemRow({ dayId, item }: { dayId: string; item: MenuItem }) {
  const { product, forSale } = item;
  const [error, setError] = useState<string | null>(null);
  const sold = plural(item.stock.soldUnits, "vendido", "vendidos");

  async function attempt(write: () => Promise<void>) {
    setError(null);
    try {
      await write();
    } catch (e) {
      setError(e instanceof WriteError ? e.message : "Não foi possível salvar.");
    }
  }

  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 rounded-xl border border-border bg-card p-3.5 wide:gap-x-4 wide:gap-y-1 wide:rounded-none wide:border-x-0 wide:border-b-0 wide:px-5 wide:py-3 ${COLUMNS} ${forSale ? "" : "opacity-65 wide:opacity-60"}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-[38px] flex-none items-center justify-center rounded-[9px] border border-border bg-muted text-xs font-semibold wide:size-[34px] wide:rounded-lg wide:text-[11px]">
          {initials(product.name)}
        </span>
        <div className="flex min-w-0 flex-col leading-[1.3]">
          <strong className="truncate font-semibold">{product.name}</strong>
          <span className="text-[11px] text-muted-foreground wide:hidden">{sold}</span>
        </div>
      </div>

      <div
        className={`col-span-2 grid-cols-2 items-start gap-2.5 border-t border-border pt-3 wide:contents ${forSale ? "grid" : "hidden"}`}
      >
        <DayPrice dayId={dayId} item={item} attempt={attempt} onError={setError} />
        <DayQuantity dayId={dayId} item={item} attempt={attempt} onError={setError} />
      </div>

      <span className="hidden text-text-2 wide:block">{sold}</span>

      <label className="col-start-2 row-start-1 flex min-h-10 min-w-10 items-center justify-end gap-2 text-xs text-text-2 wide:col-start-auto wide:row-start-auto wide:justify-start">
        <Switch
          checked={forSale}
          onCheckedChange={(value) => void attempt(() => setOnMenu(getLocalDb(), dayId, product.id, value))}
          aria-label={forSale ? `Tirar ${product.name} do cardápio deste dia` : `Colocar ${product.name} no cardápio deste dia`}
        />
        <span>{forSale ? "À venda" : "Fora"}</span>
      </label>

      {error && (
        <p role="alert" className="col-span-2 text-[11px] text-warn wide:col-span-full">
          {error}
        </p>
      )}
    </li>
  );
}
