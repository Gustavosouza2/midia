"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getLocalDb } from "@/local-db";
import { setDayQuantity } from "@/local-db/writes";
import { parseQuantity, type MenuItem } from "@/lib/menu";
import { useInlineEdit } from "./use-inline-edit";

/** Quantity on this day, edited in place, with "restam N" or "Esgotado" beside it. Empty = no limit. */
export function DayQuantity({
  dayId,
  item,
  attempt,
  onError,
}: {
  dayId: string;
  item: MenuItem;
  attempt: (write: () => Promise<void>) => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const { product, stock } = item;
  const edit = useInlineEdit(stock.quantity === null ? "" : String(stock.quantity), async (text) => {
    const quantity = parseQuantity(text);
    if (quantity === undefined) return onError("Quantidade inválida. Use um número inteiro, ou deixe vazio.");
    if (quantity !== stock.quantity) await attempt(() => setDayQuantity(getLocalDb(), dayId, product.id, quantity));
  });

  return (
    <div className="flex flex-col gap-1 wide:flex-row wide:items-center wide:gap-2">
      <span className="text-[11px] text-muted-foreground wide:hidden">Quantidade</span>
      <div className="flex items-center gap-2">
        <Input
          aria-label={`Quantidade de ${product.name} neste dia`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Sem limite"
          {...edit}
          className="w-full min-w-0 bg-background font-semibold placeholder:font-normal wide:h-[30px] wide:w-24 wide:rounded-[7px]"
        />
        {stock.quantity !== null &&
          (stock.soldOut ? (
            <Badge variant="warn" className="h-auto flex-none rounded-md px-[7px] py-px font-normal">
              Esgotado
            </Badge>
          ) : (
            <span className="flex-none text-[11px] whitespace-nowrap text-muted-foreground">restam {stock.remaining}</span>
          ))}
      </div>
    </div>
  );
}
