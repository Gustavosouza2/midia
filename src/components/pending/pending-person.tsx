"use client";

import { cn } from "cn";
import { useState } from "react";
import { PayButtons } from "@/components/pay-buttons";
import { getLocalDb } from "@/local-db";
import { WriteError, refundPayment, recordPayment } from "@/local-db/writes";
import { formatBRL, initials, plural } from "@/lib/format";
import type { PaymentMethod, PendingPerson as Person } from "@/lib/pending";
import { AgeBadge } from "./age-badge";
import { PaidStatus } from "./paid-status";
import { PendingOrderLine } from "./pending-order-line";

/**
 * One person and everything they owe. The main buttons receive all their open orders in one tap;
 * with more than one order, each order also has its own smaller buttons.
 * Phone: the main buttons span the width below. Tablet and desktop: on the right of the name.
 */
export function PendingPerson({
  person,
  onReceived,
}: {
  person: Person;
  onReceived: (orderId: string, paymentId: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state } = person;
  const paid = state.type === "paid";
  const single = person.orders.length === 1 ? person.orders[0] : null;

  async function save(write: () => Promise<void>) {
    setSaving(true);
    setError(null);
    try {
      await write();
    } catch (e) {
      setError(e instanceof WriteError ? e.message : "Não foi possível gravar no aparelho.");
    } finally {
      setSaving(false);
    }
  }

  /** One payment per order; each one already received stays received even if a later one fails. */
  const pay = (orderIds: string[], method: PaymentMethod) =>
    save(async () => {
      for (const orderId of orderIds) onReceived(orderId, await recordPayment(getLocalDb(), orderId, method));
    });
  const undo = (paymentIds: string[]) =>
    save(async () => {
      for (const paymentId of paymentIds) await refundPayment(getLocalDb(), paymentId);
    });
  const openOrderIds = person.orders.filter((o) => o.state.type === "open").map((o) => o.orderId);

  return (
    <div
      role="group"
      aria-label={person.name}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 border-t border-border px-4 py-3.5 animate-in duration-300 fade-in first:border-t-0 tablet:grid-cols-[minmax(0,1fr)_auto_auto] tablet:gap-x-5 tablet:px-5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 flex-none items-center justify-center rounded-[10px] border border-border bg-muted text-xs font-semibold">
          {initials(person.name)}
        </span>
        <div className="flex min-w-0 flex-col leading-[1.3]">
          <strong className={cn("truncate font-semibold", paid && "text-muted-foreground line-through")}>
            {person.name}
          </strong>
          <span className="truncate text-[11px] text-muted-foreground">
            {single ? `${single.items} · ${single.day}` : plural(person.orders.length, "pedido", "pedidos")}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-0.5 leading-[1.3]">
        <strong className="text-base font-semibold">{formatBRL(person.amount)}</strong>
        <AgeBadge ageDays={person.ageDays} muted={paid} />
      </div>

      <div className="col-span-full tablet:col-span-1 tablet:col-start-3 tablet:row-start-1">
        {state.type === "paid" ? (
          <PaidStatus
            key="paid"
            method={state.method}
            disabled={saving}
            onUndo={() => undo(state.paymentIds)}
            className="tablet:justify-end"
          />
        ) : (
          <PayButtons
            key="open"
            subject={person.name}
            disabled={saving}
            onPay={(method) => pay(openOrderIds, method)}
            className="animate-in duration-200 fade-in"
            buttonClassName="h-11 flex-1 text-sm tablet:h-9 tablet:flex-none tablet:px-4"
          />
        )}
      </div>

      {!single && (
        <ul
          aria-label={`Pedidos de ${person.name}`}
          className="col-span-full flex flex-col divide-y divide-border rounded-[10px] bg-muted px-3 py-2.5"
        >
          {person.orders.map((order) => (
            <PendingOrderLine
              key={order.orderId}
              name={person.name}
              order={order}
              personPaid={paid}
              saving={saving}
              onPay={(method) => pay([order.orderId], method)}
              onUndo={(paymentId) => undo([paymentId])}
            />
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="col-span-full text-[11px] text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
