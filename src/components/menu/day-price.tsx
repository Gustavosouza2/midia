"use client";

import { getLocalDb } from "@/local-db";
import { setDayPrice } from "@/local-db/writes";
import { formatReaisInput, parseReais, type MenuItem } from "@/lib/menu";
import { formatBRL } from "@/lib/format";
import { CurrencyField } from "./currency-field";
import { useInlineEdit } from "./use-inline-edit";

/** Price on this day, edited in place. The default price shows below only when this day's differs. */
export function DayPrice({
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
  const { product } = item;
  const edit = useInlineEdit(formatReaisInput(item.priceCents), async (text) => {
    const priceCents = parseReais(text);
    if (priceCents === null) return onError("Preço inválido. Use reais, como 12 ou 12,50.");
    if (priceCents !== item.priceCents) await attempt(() => setDayPrice(getLocalDb(), dayId, product.id, priceCents));
  });

  return (
    <div className="flex flex-col gap-1 wide:flex-row wide:items-center wide:gap-2">
      <span className="text-[11px] text-muted-foreground wide:hidden">Preço neste dia</span>
      <div className="wide:w-24 wide:flex-none">
        <CurrencyField
          aria-label={`Preço de ${product.name} neste dia`}
          {...edit}
          className="font-semibold wide:h-[30px] wide:rounded-[7px] wide:pl-7"
        />
      </div>
      {item.differsFromDefault && (
        <span className="text-[11px] text-muted-foreground">padrão {formatBRL(product.priceCents)}</span>
      )}
    </div>
  );
}
