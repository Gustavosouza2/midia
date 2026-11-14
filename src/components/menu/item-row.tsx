"use client";

import { Pencil, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getLocalDb } from "@/local-db";
import { setOnMenu, setDayPrice, WriteError } from "@/local-db/writes";
import { parseReais, formatReaisInput, type MenuItem } from "@/lib/menu";
import { formatBRL, initials, plural } from "@/lib/format";
import { CurrencyField } from "./currency-field";
import { COLUMNS } from "./columns";
import { DayQuantity } from "./day-quantity";

/**
 * An item on the day's menu. Up to 1180px: a card with the switch at the top and the price and quantity
 * below (only when it is for sale). Above: a table row.
 */
export function ItemRow({ dayId, item }: { dayId: string; item: MenuItem }) {
  const { product, forSale } = item;
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function attempt(write: () => Promise<void>) {
    setError(null);
    try {
      await write();
      return true;
    } catch (e) {
      setError(e instanceof WriteError ? e.message : "Não foi possível salvar.");
      return false;
    }
  }

  async function savePrice(event: FormEvent) {
    event.preventDefault();
    const priceCents = parseReais(draft ?? "");
    if (priceCents === null) return setError("Preço inválido. Use reais, como 12 ou 12,50.");
    if (priceCents === item.priceCents) return setDraft(null);
    if (await attempt(() => setDayPrice(getLocalDb(), dayId, product.id, priceCents))) setDraft(null);
  }

  function cancel() {
    setDraft(null);
    setError(null);
  }

  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 rounded-xl border border-border bg-card p-3.5 wide:gap-x-4 wide:gap-y-1 wide:rounded-none wide:border-x-0 wide:border-b-0 wide:px-5 wide:py-3.5 ${COLUMNS} ${forSale ? "" : "opacity-65 wide:opacity-60"}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-[38px] flex-none items-center justify-center rounded-[9px] border border-border bg-muted text-xs font-semibold wide:size-[34px] wide:rounded-lg wide:text-[11px]">
          {initials(product.name)}
        </span>
        <div className="flex min-w-0 flex-col leading-[1.3]">
          <strong className="truncate font-semibold">{product.name}</strong>
          <span className="text-[11px] text-muted-foreground">
            <span className="wide:hidden">
              {plural(item.stock.soldUnits, "vendido", "vendidos")} · padrão {formatBRL(product.priceCents)}
            </span>
            <span className="hidden wide:inline">Preço padrão {formatBRL(product.priceCents)}</span>
          </span>
        </div>
      </div>

      <div
        className={`col-span-2 flex-col gap-1 border-t border-border pt-3 wide:col-span-1 wide:flex wide:border-t-0 wide:pt-0 ${forSale ? "flex" : "hidden"}`}
      >
        {draft === null ? (
          <div className="flex items-center justify-between gap-2.5 wide:justify-start wide:gap-2">
            <div className="flex flex-col leading-tight wide:flex-row wide:items-center wide:gap-2">
              <span className="text-[11px] text-muted-foreground wide:hidden">Preço neste dia</span>
              <strong className="text-lg font-semibold wide:min-w-16 wide:text-[13px]">
                {formatBRL(item.priceCents)}
              </strong>
              {item.differsFromDefault && (
                <Badge variant="ok" className="h-auto rounded-md px-[7px] py-px font-normal">
                  diferente do padrão
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              aria-label={`Mudar o preço de ${product.name} neste dia`}
              onClick={() => setDraft(formatReaisInput(item.priceCents))}
              className="h-9 rounded-[9px] wide:size-7 wide:rounded-[7px] wide:px-0 wide:text-text-2"
            >
              <Pencil className="size-3.5 wide:size-[13px]" />
              <span className="wide:hidden">Mudar preço</span>
            </Button>
          </div>
        ) : (
          <form onSubmit={savePrice} className="flex items-center gap-2">
            <div className="flex-1 wide:w-24 wide:flex-none">
              <CurrencyField
                aria-label="Novo preço"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && cancel()}
                className="font-semibold wide:h-[30px] wide:rounded-[7px] wide:pl-7"
              />
            </div>
            <Button
              type="submit"
              className="h-[42px] rounded-[10px] px-3.5 text-[13px] wide:h-[30px] wide:rounded-[7px] wide:px-2.5 wide:text-xs"
            >
              Salvar
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-label="Cancelar"
              onClick={cancel}
              className="size-[42px] px-0 text-muted-foreground wide:h-[30px] wide:w-[26px]"
            >
              <X className="size-4" />
            </Button>
          </form>
        )}
      </div>

      <div className={`col-span-2 wide:col-span-1 wide:block ${forSale ? "block" : "hidden"}`}>
        <DayQuantity dayId={dayId} item={item} attempt={attempt} onError={setError} />
      </div>

      <span className="hidden text-text-2 wide:block">{plural(item.stock.soldUnits, "vendido", "vendidos")}</span>

      <label className="col-start-2 row-start-1 flex items-center gap-2 p-1 text-xs text-text-2 wide:col-start-auto wide:row-start-auto wide:p-0">
        <Switch
          checked={forSale}
          onCheckedChange={(value) => void attempt(() => setOnMenu(getLocalDb(), dayId, product.id, value))}
          aria-label={forSale ? `Tirar ${product.name} do cardápio deste dia` : `Colocar ${product.name} no cardápio deste dia`}
        />
        <span className="hidden wide:inline">{forSale ? "À venda" : "Fora"}</span>
      </label>

      {error && (
        <p role="alert" className="col-span-2 text-[11px] text-warn wide:col-start-2">
          {error}
        </p>
      )}
    </li>
  );
}
