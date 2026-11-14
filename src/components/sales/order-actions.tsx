"use client";

import { cn } from "cn";
import { X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLocalDb, type CanteenLocalDb } from "@/local-db";
import {
  deliverReservation,
  WriteError,
  refundPayment,
  recordPayment,
  type PaymentMethod,
} from "@/local-db/writes";
import { paidLabel, type DayOrder } from "@/lib/sales";

/**
 * Status and actions of an order (same pattern as Pending):
 * - pending: "Pendente" or "Marcar pago" opens Pix · Dinheiro · × in its place;
 * - paid: "Pago · Pix"; in the table, tapping offers "Desfazer"; on the card and the board, "Desfazer" directly;
 * - reserved: "Reservado" and "Entregar" (the payment stays as it was).
 * `placement` only changes the form: clickable badges in the table, badge + button on the card, just the button on the board.
 */
export function OrderActions({ order, placement }: { order: DayOrder; placement: "table" | "card" | "board" }) {
  const [mode, setMode] = useState<"normal" | "receive" | "undo">("normal");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function run(action: (db: CanteenLocalDb) => Promise<unknown>) {
    setSaving(true);
    setError(null);
    try {
      await action(getLocalDb());
      setMode("normal");
    } catch (e) {
      setError(e instanceof WriteError ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  const receive = (method: PaymentMethod) => run((db) => recordPayment(db, order.id, method));
  const undo = () =>
    run(async (db) => {
      for (const id of order.activePayments) await refundPayment(db, id);
    });
  const deliver = () => run((db) => deliverReservation(db, order.id));

  const table = placement === "table";
  const buttonClass = table ? "h-[26px] rounded-md px-2.5 text-[11px]" : "h-[30px] px-3";
  const badgeClass = table ? "h-[26px] rounded-md px-2.5" : "h-[30px] rounded-lg px-2.5 text-xs";
  const closeButton = (
    <Button
      variant="ghost"
      aria-label="Cancelar"
      disabled={saving}
      onClick={() => setMode("normal")}
      className={cn(buttonClass, "px-1.5")}
    >
      <X className="size-3.5" />
    </Button>
  );

  let content;
  if (order.status === "reserved") {
    content = (
      <>
        {placement !== "board" && (
          <Badge variant="outline" className={cn(badgeClass, "border-input bg-muted")}>
            Reservado
          </Badge>
        )}
        <Button variant={placement === "board" ? "outline" : "default"} disabled={saving} onClick={deliver} className={buttonClass}>
          Entregar
        </Button>
      </>
    );
  } else if (mode === "receive") {
    content = (
      <>
        {(["pix", "dinheiro"] as const).map((method) => (
          <Button key={method} disabled={saving} onClick={() => receive(method)} className={buttonClass}>
            {method === "pix" ? "Pix" : "Dinheiro"}
          </Button>
        ))}
        {closeButton}
      </>
    );
  } else if (mode === "undo") {
    content = (
      <>
        <Badge variant="ok" className={badgeClass}>
          {paidLabel(order.methods)}
        </Badge>
        <Button variant="outline" disabled={saving} onClick={undo} className={buttonClass}>
          Desfazer
        </Button>
        {closeButton}
      </>
    );
  } else if (order.status === "pending") {
    content = table ? (
      <Badge asChild variant="warn" className={cn(badgeClass, "cursor-pointer hover:brightness-95")}>
        <button type="button" aria-label="Pendente. Tocar para marcar como pago" onClick={() => setMode("receive")}>
          Pendente
        </button>
      </Badge>
    ) : (
      <>
        {placement === "card" && (
          <Badge variant="warn" className={badgeClass}>
            Pendente
          </Badge>
        )}
        <Button
          variant={placement === "board" ? "outline" : "default"}
          onClick={() => setMode("receive")}
          className={buttonClass}
        >
          Marcar pago
        </Button>
      </>
    );
  } else {
    content = table ? (
      <Badge asChild variant="ok" className={cn(badgeClass, "cursor-pointer hover:brightness-95")}>
        <button
          type="button"
          aria-label={`${paidLabel(order.methods)}. Tocar para desfazer`}
          onClick={() => setMode("undo")}
        >
          {paidLabel(order.methods)}
        </button>
      </Badge>
    ) : (
      <>
        {placement === "card" && (
          <Badge variant="ok" className={badgeClass}>
            {paidLabel(order.methods)}
          </Badge>
        )}
        <Button variant="outline" disabled={saving} onClick={undo} className={buttonClass}>
          Desfazer
        </Button>
      </>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        key={`${order.status}-${mode}`}
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
