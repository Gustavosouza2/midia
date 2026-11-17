"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLocalDb, type CanteenLocalDb } from "@/local-db";
import { deliverReservation, WriteError, refundPayment, recordPayment } from "@/local-db/writes";
import { paidLabel, type DayOrder } from "@/lib/sales";
import { PayButtons } from "../pay-buttons";

/**
 * Status and the one action that moves the order forward, each a single tap:
 * - pending: "Pix" / "Dinheiro" receive what is left;
 * - paid: "Pago · Pix" and "Desfazer" (refunds);
 * - reserved: "Entregar" (the payment stays as it was).
 */
export function OrderActions({ order }: { order: DayOrder }) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function run(action: (db: CanteenLocalDb) => Promise<unknown>) {
    setSaving(true);
    setError(null);
    try {
      await action(getLocalDb());
    } catch (e) {
      setError(e instanceof WriteError ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  let content;
  if (order.status === "reserved") {
    content = (
      <>
        <Badge variant="outline" className="h-[30px] rounded-lg border-input bg-muted px-2.5">
          Reservado
        </Badge>
        <Button
          disabled={saving}
          onClick={() => run((db) => deliverReservation(db, order.id))}
          className="h-[30px] px-3"
        >
          Entregar
        </Button>
      </>
    );
  } else if (order.status === "pending") {
    content = (
      <>
        <Badge variant="warn" className="h-[30px] rounded-lg px-2.5">
          Pendente
        </Badge>
        <PayButtons
          subject={order.name}
          disabled={saving}
          onPay={(method) => run((db) => recordPayment(db, order.id, method))}
        />
      </>
    );
  } else {
    content = (
      <>
        <Badge variant="ok" className="h-[30px] rounded-lg px-2.5">
          {paidLabel(order.methods)}
        </Badge>
        <Button
          variant="ghost"
          disabled={saving}
          aria-label={`Desfazer pagamento de ${order.name}`}
          onClick={() =>
            run(async (db) => {
              for (const id of order.activePayments) await refundPayment(db, id);
            })
          }
          className="h-[30px] px-2.5 text-muted-foreground underline underline-offset-3"
        >
          Desfazer
        </Button>
      </>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        key={order.status}
        role="group"
        aria-label={`Status de ${order.name}`}
        className="flex flex-wrap items-center justify-end gap-1.5 animate-in duration-200 fade-in zoom-in-95"
      >
        {content}
      </div>
      {error && (
        <p role="alert" className="text-[11px] text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
