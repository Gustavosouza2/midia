"use client";

import { Card } from "@/components/ui/card";
import type { DayOrder } from "@/lib/sales";
import { OrderActions } from "./order-actions";
import { OrderAmount } from "./order-amount";

export function OrderTable({ orders }: { orders: DayOrder[] }) {
  const cellClass = "border-b border-border px-4 py-2.5 group-last:border-b-0";
  const headerClass = "border-b border-border bg-muted px-4 py-2 text-[11px] font-medium text-muted-foreground";

  return (
    <Card className="hidden tablet:flex">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${headerClass} text-left`}>Nome</th>
              <th className={`${headerClass} text-left`}>Itens</th>
              <th className={`${headerClass} text-right`}>Valor</th>
              <th className={`${headerClass} text-right`}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((p) => (
              <tr key={p.id} className="group animate-in duration-300 fade-in">
                <td className={`${cellClass} leading-[1.3]`}>
                  <strong className="block font-semibold">{p.name}</strong>
                  <span className="text-[11px] text-muted-foreground">{p.time}</span>
                </td>
                <td className={`${cellClass} text-text-2`}>{p.description}</td>
                <td className={`${cellClass} text-right whitespace-nowrap`}>
                  <OrderAmount order={p} />
                </td>
                <td className={`${cellClass} py-2 text-right whitespace-nowrap`}>
                  <OrderActions order={p} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
