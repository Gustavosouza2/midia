"use client";

import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import type { DayOrder } from "@/lib/sales";
import { OrderActions } from "./order-actions";

export function OrderCards({ orders }: { orders: DayOrder[] }) {
  return (
    <ul aria-label="Pedidos" className="flex flex-col gap-2 tablet:hidden">
      {orders.map((p) => (
        <li key={p.id} className="animate-in duration-300 fade-in slide-in-from-top-1">
          <Card className="gap-2 px-3.5 py-3">
            <div className="flex justify-between gap-2.5">
              <div className="flex min-w-0 flex-col leading-[1.3]">
                <strong className="truncate font-semibold">{p.name}</strong>
                <span className="text-[11px] text-text-2">{p.description}</span>
              </div>
              <div className="flex flex-col items-end leading-[1.3]">
                <strong className="font-semibold">{formatBRL(p.amount)}</strong>
                <span className="text-[11px] text-muted-foreground">{p.time}</span>
              </div>
            </div>
            <OrderActions order={p} />
          </Card>
        </li>
      ))}
    </ul>
  );
}
