"use client";

import { cn } from "cn";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getLocalDb } from "@/local-db";
import { WriteError, refundPayment, recordPayment } from "@/local-db/writes";
import { formatBRL, initials, plural } from "@/lib/format";
import { OLD_PENDING_DAYS } from "@/lib/dashboard";
import type { PaymentMethod, PendingRow as Row } from "@/lib/pending";

/** Phone: 38px buttons that split the width. Tablet and desktop: 30px, sized to the text. */
const BUTTON = "h-[38px] flex-1 rounded-[9px] text-[13px] tablet:h-[30px] tablet:flex-none tablet:rounded-[7px] tablet:text-xs";
const PAID_WITH: Record<PaymentMethod, string> = { pix: "Pago via Pix", dinheiro: "Pago em dinheiro" };

/**
 * One row per outstanding order. Phone: a card with the buttons below. Tablet: the same, with
 * the actions on a full row. Desktop: columns person · age · amount · actions.
 */
export function PendingRow({
  row,
  choosing,
  onOpen,
  onClose,
  onReceive,
}: {
  row: Row;
  choosing: boolean;
  onOpen: () => void;
  onClose: () => void;
  onReceive: (paymentId: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state } = row;
  const paid = state.type === "paid";
  const old = row.ageDays >= OLD_PENDING_DAYS;
  const age = row.ageDays === 0 ? "hoje" : `há ${plural(row.ageDays, "dia", "dias")}`;

  async function save<T>(write: () => Promise<T>, onDone: (result: T) => void) {
    setSaving(true);
    setError(null);
    try {
      onDone(await write());
    } catch (e) {
      setError(e instanceof WriteError ? e.message : "Não foi possível gravar no aparelho.");
    } finally {
      setSaving(false);
    }
  }

  const receive = (method: PaymentMethod) =>
    save(() => recordPayment(getLocalDb(), row.orderId, method), onReceive);

  return (
    <div
      role="group"
      aria-label={row.name}
      className="flex flex-col gap-2.5 border-t border-border px-3.5 py-3 animate-in duration-300 fade-in slide-in-from-top-1 tablet:grid tablet:grid-cols-[minmax(0,1fr)_auto] tablet:items-center tablet:gap-x-4 tablet:px-5 desk:grid-cols-[minmax(0,1fr)_110px_80px_210px]"
    >
      <div className="flex items-center gap-2.5 tablet:contents">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 tablet:gap-3">
          <span className="flex size-[34px] flex-none items-center justify-center rounded-[9px] border border-border bg-muted text-[11px] font-semibold tablet:size-8 tablet:rounded-lg">
            {initials(row.name)}
          </span>
          <div className="flex min-w-0 flex-col leading-[1.3]">
            <strong className={cn("truncate font-semibold", paid && "text-muted-foreground line-through")}>
              {row.name}
            </strong>
            <span className="truncate text-[11px] text-muted-foreground">{row.description}</span>
          </div>
        </div>

        <span className="hidden desk:block">
          <span
            className={cn(
              "rounded-md px-[7px] py-0.5 text-[11px]",
              paid ? "bg-accent text-muted-foreground" : old ? "bg-warn-soft text-warn" : "bg-accent text-text-2",
            )}
          >
            {age}
          </span>
        </span>

        <div className="flex flex-col items-end leading-[1.3]">
          <strong className="font-semibold">{formatBRL(row.amount)}</strong>
          <span
            className={cn(
              "text-[11px] desk:hidden",
              paid ? "text-foreground" : old ? "text-warn" : "text-muted-foreground",
            )}
          >
            {paid ? "pago" : age}
          </span>
        </div>
      </div>

      <div
        key={`${state.type}-${choosing}`}
        className="flex gap-2 animate-in duration-200 fade-in zoom-in-95 tablet:col-span-full tablet:gap-1.5 desk:col-span-1 desk:justify-end"
      >
        {state.type === "paid" ? (
          <>
            <span
              key="paid"
              role="status"
              className={cn(BUTTON, "inline-flex items-center justify-center bg-ok-soft text-ok tablet:px-2.5")}
            >
              {PAID_WITH[state.method]}
            </span>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => save(() => refundPayment(getLocalDb(), state.paymentId), () => {})}
              className="h-[38px] rounded-[9px] px-3 text-text-2 tablet:h-[30px] tablet:rounded-[7px] tablet:border-0 tablet:bg-transparent tablet:px-2.5 tablet:text-muted-foreground tablet:underline tablet:underline-offset-3"
            >
              Desfazer
            </Button>
          </>
        ) : choosing ? (
          <>
            <Button key="pix" autoFocus disabled={saving} onClick={() => receive("pix")} className={BUTTON}>
              Pix
            </Button>
            <Button
              disabled={saving}
              onClick={() => receive("dinheiro")}
              className={cn(
                BUTTON,
                "tablet:border tablet:border-input tablet:bg-background tablet:text-foreground tablet:hover:bg-accent",
              )}
            >
              Dinheiro
            </Button>
            <Button
              variant="outline"
              aria-label="Cancelar"
              disabled={saving}
              onClick={onClose}
              className="size-[38px] rounded-[9px] p-0 text-muted-foreground tablet:size-[30px] tablet:rounded-[7px] tablet:border-0 tablet:bg-transparent"
            >
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <Button
            key="receive"
            variant="outline"
            aria-label={`Receber ${formatBRL(row.amount)} de ${row.name}`}
            onClick={onOpen}
            className={cn(
              BUTTON,
              "tablet:border-0 tablet:bg-primary tablet:px-3 tablet:text-primary-foreground tablet:hover:bg-primary/90",
            )}
          >
            Receber
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-[11px] text-warn tablet:col-span-full desk:text-right">
          {error}
        </p>
      )}
    </div>
  );
}
