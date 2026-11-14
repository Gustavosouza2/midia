"use client";

import { Pencil, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLocalDb } from "@/local-db";
import { setDayQuantity } from "@/local-db/writes";
import { parseQuantity, type MenuItem } from "@/lib/menu";

/** "50 · restam 32", "50 · Esgotado" or "Sem limite", with the pencil to change it. Empty = no limit. */
export function DayQuantity({
  dayId,
  item,
  attempt,
  onError,
}: {
  dayId: string;
  item: MenuItem;
  attempt: (write: () => Promise<void>) => Promise<boolean>;
  onError: (message: string | null) => void;
}) {
  const { product, stock } = item;
  const [draft, setDraft] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    const quantity = parseQuantity(draft ?? "");
    if (quantity === undefined) return onError("Quantidade inválida. Use um número inteiro, ou deixe vazio para sem limite.");
    if (quantity === stock.quantity) return setDraft(null);
    if (await attempt(() => setDayQuantity(getLocalDb(), dayId, product.id, quantity))) setDraft(null);
  }

  function cancel() {
    setDraft(null);
    onError(null);
  }

  if (draft !== null) {
    return (
      <form onSubmit={save} className="flex items-center gap-2">
        <Input
          aria-label="Quantidade neste dia"
          autoFocus
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Sem limite"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && cancel()}
          className="flex-1 bg-background font-semibold wide:h-[30px] wide:w-24 wide:flex-none wide:rounded-[7px]"
        />
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
    );
  }

  return (
    <div className="flex items-center justify-between gap-2.5 wide:justify-start wide:gap-2">
      <div className="flex flex-col leading-tight wide:flex-row wide:items-center wide:gap-2">
        <span className="text-[11px] text-muted-foreground wide:hidden">Quantidade neste dia</span>
        {stock.quantity === null ? (
          <span className="text-sm text-text-2 wide:text-[13px]">Sem limite</span>
        ) : (
          <span className="flex items-center gap-1.5">
            <strong className="text-lg font-semibold wide:text-[13px]">{stock.quantity}</strong>
            {stock.soldOut ? (
              <Badge variant="warn" className="h-auto rounded-md px-[7px] py-px font-normal">
                Esgotado
              </Badge>
            ) : (
              <span className="text-[11px] text-muted-foreground">· restam {stock.remaining}</span>
            )}
          </span>
        )}
      </div>
      <Button
        variant="outline"
        aria-label={`Mudar a quantidade de ${product.name} neste dia`}
        onClick={() => setDraft(stock.quantity === null ? "" : String(stock.quantity))}
        className="h-9 rounded-[9px] wide:size-7 wide:rounded-[7px] wide:px-0 wide:text-text-2"
      >
        <Pencil className="size-3.5 wide:size-[13px]" />
        <span className="wide:hidden">Mudar quantidade</span>
      </Button>
    </div>
  );
}
