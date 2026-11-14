"use client";

import { cn } from "cn";
import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getLocalDb } from "@/local-db";
import { WriteError, placeOrder, type NewOrder } from "@/local-db/writes";
import { formatBRL } from "@/lib/format";
import { parsePrice, formatPriceInput, type MenuItem } from "@/lib/sales";
import { Field } from "./field";

const MAX_QUANTITY = 99;

/**
 * New sale or reservation of one item. `row`: the single-row card on desktop; `sheet`: the fields
 * stacked in the phone sheet. After submitting, clears Quem and Qtd and keeps the item.
 */
export function OrderForm({
  dayId,
  menu,
  layout,
  onSubmitted,
}: {
  dayId: string;
  menu: MenuItem[];
  layout: "row" | "sheet";
  onSubmitted?: () => void;
}) {
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<NewOrder["type"]>("sale");
  const [name, setName] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  /** null = the price on the day's menu. */
  const [priceText, setPriceText] = useState<string | null>(null);
  const [payment, setPayment] = useState<NewOrder["payment"]>("pending");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const row = layout === "row";
  const item =
    menu.find((i) => i.productId === productId) ?? menu.find((i) => i.remaining !== 0) ?? menu[0];

  if (!item) {
    return (
      <Card className={cn("px-4 py-5 text-xs text-muted-foreground", !row && "border-0 px-0 py-2")}>
        <p>
          Nenhum item à venda neste dia.{" "}
          <Link transitionTypes={["screen"]} href="/menu" className="font-semibold text-foreground underline underline-offset-[3px]">
            Monte o cardápio do dia
          </Link>{" "}
          para registrar vendas.
        </p>
      </Card>
    );
  }

  // Qtd goes up to what remains of the item on the day; switching items does not exceed the new one's limit.
  const max = Math.max(1, Math.min(MAX_QUANTITY, item.remaining ?? MAX_QUANTITY));
  const quantity = Math.min(qty, max);
  const text = priceText ?? formatPriceInput(item.priceCents);
  const price = parsePrice(text);
  const total = price === null ? null : price * quantity;
  const reservation = type === "reservation";
  const buttonLabel = `${reservation ? "Reservar" : "Registrar"} · ${total === null ? "—" : formatBRL(total)}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (price === null) return setError("Preço inválido.");
    if (!name.trim() && (reservation || payment === "pending")) {
      nameRef.current?.focus();
      return setError(reservation ? "Diga quem reservou." : "Diga quem vai pagar depois.");
    }
    setSaving(true);
    setError(null);
    try {
      await placeOrder(getLocalDb(), {
        dayId,
        customerName: name,
        type,
        productId: item.productId,
        quantity,
        unitPriceCents: price,
        payment,
      });
      setName("");
      setQty(1);
      setPriceText(null);
      setPayment("pending");
      nameRef.current?.focus();
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof WriteError ? e.message : "Não foi possível registrar.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "flex h-[42px] min-w-0 items-center rounded-[10px] border border-input bg-muted tablet:h-[38px] tablet:rounded-lg";
  const segmentClass = "h-[34px] tablet:h-[30px]";

  const fields = (
    <>
      <Field label="Tipo" id={`${id}-type`}>
        <ToggleGroup
          type="single"
          aria-labelledby={`${id}-type`}
          value={type}
          onValueChange={(v) => v && setType(v as typeof type)}
        >
          <ToggleGroupItem value="sale" className={segmentClass}>
            Venda
          </ToggleGroupItem>
          <ToggleGroupItem value="reservation" className={segmentClass}>
            Reserva
          </ToggleGroupItem>
        </ToggleGroup>
      </Field>

      <div className={cn("flex min-w-0 flex-col gap-1", row && "flex-[1_1_140px]")}>
        <Label htmlFor={`${id}-name`}>Quem</Label>
        <Input
          ref={nameRef}
          id={`${id}-name`}
          autoComplete="off"
          placeholder="Nome da pessoa"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="tablet:h-[38px]"
        />
      </div>

      <div className={cn("flex min-w-0 flex-col gap-1", row && "flex-[1_1_150px]")}>
        <Label htmlFor={`${id}-item`}>Item</Label>
        <select
          id={`${id}-item`}
          value={item.productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setPriceText(null);
          }}
          className={cn(
            fieldClass,
            "px-2.5 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring tablet:text-xs",
          )}
        >
          {menu.map((i) => (
            <option key={i.productId} value={i.productId} disabled={i.remaining === 0}>
              {i.name} · {formatBRL(i.priceCents)}
              {i.remaining === 0 ? " · esgotado" : i.remaining !== null ? ` · restam ${i.remaining}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className={cn("grid grid-cols-2 gap-2.5", row && "contents")}>
        <Field label="Qtd" id={`${id}-qty`}>
          <div role="group" aria-labelledby={`${id}-qty`} className={fieldClass}>
            <Button
              type="button"
              variant="ghost"
              aria-label="Diminuir"
              disabled={quantity <= 1}
              onClick={() => setQty(Math.max(1, quantity - 1))}
              className="h-full w-11 rounded-none text-foreground tablet:w-8"
            >
              <Minus className="size-4" />
            </Button>
            <output aria-live="polite" className="min-w-[26px] flex-1 text-center text-[15px] font-semibold tablet:text-[13px]">
              {quantity}
            </output>
            <Button
              type="button"
              variant="ghost"
              aria-label="Aumentar"
              disabled={quantity >= max}
              onClick={() => setQty(Math.min(max, quantity + 1))}
              className="h-full w-11 rounded-none text-foreground tablet:w-8"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </Field>

        <div className="flex min-w-0 flex-col gap-1">
          <Label htmlFor={`${id}-price`}>Preço un.</Label>
          <div className={cn(fieldClass, "gap-1.5 px-3 tablet:px-2.5", row && "w-[100px]")}>
            <span className="text-[11px] text-muted-foreground">R$</span>
            <input
              id={`${id}-price`}
              inputMode="decimal"
              autoComplete="off"
              value={text}
              onChange={(e) => setPriceText(e.target.value)}
              aria-invalid={price === null ? true : undefined}
              className="h-full w-full min-w-0 bg-transparent text-sm text-foreground outline-none tablet:text-xs"
            />
          </div>
        </div>
      </div>

    </>
  );

  const paymentField = (
    <Field label="Pagamento" id={`${id}-payment`}>
      <ToggleGroup
        type="single"
        aria-labelledby={`${id}-payment`}
        value={payment}
        onValueChange={(v) => v && setPayment(v as typeof payment)}
      >
        <ToggleGroupItem value="pending" className={segmentClass}>
          Pendente
        </ToggleGroupItem>
        <ToggleGroupItem value="pix" className={segmentClass}>
          Pix
        </ToggleGroupItem>
        <ToggleGroupItem value="dinheiro" className={segmentClass}>
          Dinheiro
        </ToggleGroupItem>
      </ToggleGroup>
    </Field>
  );

  const message = error && (
    <p role="alert" className={cn("text-[11px] text-warn", row && "basis-full")}>
      {error}
    </p>
  );

  if (row) {
    return (
      <Card className="shadow-float">
        <form
          aria-label="Nova venda ou reserva"
          onSubmit={submit}
          className="flex flex-wrap items-end gap-2.5 p-3.5"
        >
          {fields}
          <div className="ml-auto flex items-end gap-2.5">
            {paymentField}
            <Button type="submit" disabled={saving} className="h-[38px] px-4 font-semibold">
              {buttonLabel}
            </Button>
          </div>
          {message}
        </form>
      </Card>
    );
  }

  return (
    <form aria-label="Nova venda ou reserva" onSubmit={submit} className="flex flex-col gap-3">
      {fields}
      {paymentField}
      {message}
      <Button type="submit" size="lg" disabled={saving} className="h-12 rounded-xl text-sm">
        {buttonLabel}
      </Button>
    </form>
  );
}
