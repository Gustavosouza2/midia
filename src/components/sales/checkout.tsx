"use client";

import { cn } from "cn";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getLocalDb } from "@/local-db";
import { placeOrder, WriteError, type PaymentMethod } from "@/local-db/writes";
import { cartLines, cartTotal, orderLines, setQuantity } from "@/lib/cart";
import type { Draft } from "@/lib/draft";
import { formatBRL, plural } from "@/lib/format";
import type { MenuItem } from "@/lib/sales";
import { CartLineRow } from "./cart-line-row";

export type Placed = { orderId: string; total: number; payment: "pending" | PaymentMethod; draft: Draft };

const PAYMENTS: ["pix" | "dinheiro" | "pending", string][] = [
  ["pix", "Pix"],
  ["dinheiro", "Dinheiro"],
  ["pending", "Pendente"],
];

/**
 * The order being put together and how it is paid. The payment button is the confirmation: one tap
 * records the order. A name is only asked for when someone will be charged or served later.
 */
export function Checkout({
  dayId,
  menu,
  customers,
  draft,
  onChange,
  onPlaced,
}: {
  dayId: string;
  menu: MenuItem[];
  /** Known customer names, suggested while typing. */
  customers: string[];
  draft: Draft;
  onChange: (draft: Draft) => void;
  onPlaced: (placed: Placed) => void;
}) {
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lines = cartLines(draft.cart, menu);
  const total = cartTotal(lines);
  const items = lines.reduce((sum, l) => sum + l.quantity, 0);
  const reservation = draft.type === "reservation";

  async function place(payment: "pending" | PaymentMethod) {
    if (lines.length === 0) return;
    if (!draft.name.trim() && (payment === "pending" || reservation)) {
      setError(reservation ? "Escreva o nome de quem reservou." : "Escreva o nome de quem vai pagar depois.");
      nameRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const orderId = await placeOrder(getLocalDb(), {
        dayId,
        customerName: draft.name,
        type: draft.type,
        items: orderLines(lines),
        payment,
      });
      onPlaced({ orderId, total, payment, draft });
    } catch (e) {
      setError(e instanceof WriteError ? e.message : "Não foi possível salvar no aparelho.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      aria-label="Pedido"
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <ToggleGroup
          type="single"
          value={draft.type}
          onValueChange={(value) => value && onChange({ ...draft, type: value as Draft["type"] })}
          aria-label="Tipo"
        >
          <ToggleGroupItem value="sale">Venda</ToggleGroupItem>
          <ToggleGroupItem value="reservation">Reserva</ToggleGroupItem>
        </ToggleGroup>
        {lines.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setError(null);
              onChange({ ...draft, cart: [] });
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-input px-4 py-6 text-center text-xs text-muted-foreground">
          Toque nos itens para montar o pedido.
        </p>
      ) : (
        <ul aria-label="Itens do pedido" className="flex flex-col divide-y divide-border">
          {lines.map((line) => (
            <CartLineRow
              key={line.productId}
              line={line}
              onQuantity={(quantity) =>
                onChange({ ...draft, cart: setQuantity(draft.cart, menu, line.productId, quantity) })
              }
            />
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-name`}>
          Nome
          <span className="font-normal text-muted-foreground">
            {reservation ? "" : " · opcional se pagar agora"}
          </span>
        </Label>
        <Input
          ref={nameRef}
          id={`${id}-name`}
          list={`${id}-customers`}
          autoComplete="off"
          placeholder={reservation ? "Quem reservou" : "Quem está comprando"}
          value={draft.name}
          onChange={(e) => {
            setError(null);
            onChange({ ...draft, name: e.target.value });
          }}
          className="h-11 text-[13px] tablet:h-10"
        />
        <datalist id={`${id}-customers`}>
          {customers.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">
          {lines.length ? plural(items, "item", "itens") : "Total"}
        </span>
        <strong aria-label="Total do pedido" className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">
          {formatBRL(total)}
        </strong>
      </div>

      <div className="flex flex-col gap-1.5">
        <span id={`${id}-pay`} className="text-[11px] text-muted-foreground">
          {reservation ? "Reservar e pagar com" : "Registrar e pagar com"}
        </span>
        <div role="group" aria-labelledby={`${id}-pay`} className="grid grid-cols-3 gap-2">
          {PAYMENTS.map(([payment, label]) => (
            <Button
              key={payment}
              variant={payment === "pending" ? "outline" : "default"}
              disabled={saving || lines.length === 0}
              onClick={() => place(payment)}
              className={cn(
                "h-12 rounded-[10px] text-[13px] font-semibold",
                payment === "pending" && "border-warn/40 text-warn hover:bg-warn-soft",
              )}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-warn">
          {error}
        </p>
      )}
    </form>
  );
}
